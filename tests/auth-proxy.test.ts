import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import { after, before, test } from 'node:test';
import { forwardAuthRequest } from '../api/auth-proxy.ts';

const origin = 'http://localhost:3000';
let base = '';
let acceptedWrites = 0;
let last: {
  path?: string;
  cookie?: string;
  origin?: string;
  csrf?: string;
  body?: string;
} = {};
const server = createServer(async (req: IncomingMessage, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  last = {
    path: req.url,
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    csrf: req.headers['x-csrftoken'] as string,
    body,
  };
  if (body.includes('redirect')) {
    res.writeHead(302, { Location: 'https://private.example' });
    res.end();
    return;
  }
  if (body.includes('delayedAccepted')) {
    acceptedWrites++;
    const timer = setTimeout(() => {
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end('{"message":"Check your email for the next step."}');
    }, 6000);
    res.on('close', () => clearTimeout(timer));
    return;
  }
  if (body.includes('slow') || req.headers.cookie?.includes('slow-read')) {
    const timer = setTimeout(
      () => res.end('{}'),
      req.method === 'POST' ? 16000 : 6000,
    );
    res.on('close', () => clearTimeout(timer));
    return;
  }
  if (body.includes('expired')) {
    res.writeHead(403, {
      'Set-Cookie': [
        'sessionid=; Domain=backend.example; Path=/v1; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'tracking=private; Path=/',
      ],
    });
    res.end('{"private":"upstream detail"}');
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Set-Cookie', [
    'sessionid=new-session; Domain=backend.example; Path=/v1; HttpOnly; SameSite=Lax',
    'csrftoken=new-csrf; Path=/',
  ]);
  res.end(JSON.stringify({ status: 'ok' }));
});
before(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));
function request(body = '{}', headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie:
        'sessionid=old-session; csrftoken=old-csrf; analytics=private-data',
      'X-CSRFToken': 'csrf-header',
      ...headers,
    },
    body,
  });
}
const config = () => ({ apiBaseUrl: base, appOrigin: origin });

test('forwards only session/CSRF, preserves origin and each rotated cookie', async () => {
  const response = await forwardAuthRequest(
    request('{"email":"person@example.com"}'),
    'login',
    config(),
  );
  assert.equal(response.status, 200);
  assert.equal(last.path, '/v1/auth/login');
  assert.equal(last.cookie, 'sessionid=old-session; csrftoken=old-csrf');
  assert.equal(last.origin, origin);
  assert.equal(last.csrf, 'csrf-header');
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert(!cookies.join('').includes('Domain='));
  assert(cookies.every((c) => c.includes('Path=/')));
  assert(cookies[0]?.includes('HttpOnly'));
  assert(response.headers.get('Cache-Control')?.includes('no-store'));
});
test('hostile or missing Origin is rejected before upstream access', async () => {
  for (const Origin of ['https://attacker.example', 'null', '']) {
    assert.equal(
      (await forwardAuthRequest(request('{}', { Origin }), 'login', config()))
        .status,
      403,
    );
  }
});
test('unknown routes and incorrect methods are not proxied', async () => {
  assert.equal(
    (await forwardAuthRequest(request(), '../admin', config())).status,
    404,
  );
  assert.equal(
    (await forwardAuthRequest(request(), 'csrf', config())).status,
    405,
  );
});
test('malformed, oversized and non-JSON requests are rejected', async () => {
  assert.equal(
    (await forwardAuthRequest(request('{'), 'login', config())).status,
    400,
  );
  assert.equal(
    (await forwardAuthRequest(request('x'.repeat(16385)), 'login', config()))
      .status,
    413,
  );
  assert.equal(
    (
      await forwardAuthRequest(
        request('{}', { 'Content-Type': 'text/plain' }),
        'login',
        config(),
      )
    ).status,
    415,
  );
});
test('upstream redirects are rejected and cannot leak their destination', async () => {
  const response = await forwardAuthRequest(
    request('{"redirect":true}'),
    'login',
    config(),
  );
  assert.equal(response.status, 503);
  assert(!JSON.stringify(await response.json()).includes('private.example'));
});
test('connection failure is sanitized', async () => {
  const response = await forwardAuthRequest(request(), 'login', {
    apiBaseUrl: 'http://127.0.0.1:1',
    appOrigin: origin,
  });
  assert.equal(response.status, 503);
  assert(!JSON.stringify(await response.json()).includes('127.0.0.1'));
});

test('only the exact JSON media type is accepted', async () => {
  const response = await forwardAuthRequest(
    request('{}', { 'Content-Type': 'application/jsonp' }),
    'login',
    config(),
  );
  assert.equal(response.status, 415);
});

test('HTTPS cookies are secure and expiry survives sanitized errors', async () => {
  const secureOrigin = 'https://archy.example';
  const response = await forwardAuthRequest(
    request('{"expired":true}', { Origin: secureOrigin }),
    'login',
    { apiBaseUrl: base, appOrigin: secureOrigin },
  );
  assert.equal(response.status, 403);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 1);
  assert(cookies[0]?.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT'));
  assert(cookies[0]?.includes('Max-Age=0'));
  assert(cookies[0]?.includes('Secure'));
  assert(cookies[0]?.includes('HttpOnly'));
  assert(!cookies[0]?.includes('Domain='));
  assert(!JSON.stringify(await response.json()).includes('upstream detail'));
});

test('slow reads retain a short timeout with a sanitized failure', async () => {
  const start = Date.now();
  const response = await forwardAuthRequest(
    new Request(`${origin}/api/auth/csrf`, {
      headers: { Cookie: 'sessionid=slow-read' },
    }),
    'csrf',
    config(),
  );
  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, 'timeout');
  assert(Date.now() - start < 5800);
});

test('accepted signup taking over five seconds succeeds without replaying the write', async () => {
  const response = await forwardAuthRequest(
    request('{"delayedAccepted":true}'),
    'signup',
    config(),
  );
  assert.equal(response.status, 202);
  assert.equal(
    (await response.json()).message,
    'Check your email for the next step.',
  );
  assert.equal(acceptedWrites, 1);
});

test('unresponsive account writes still have a bounded timeout', async () => {
  const start = Date.now();
  const response = await forwardAuthRequest(
    request('{"slow":true}'),
    'signup',
    config(),
  );
  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, 'timeout');
  assert(Date.now() - start < 18000);
});
