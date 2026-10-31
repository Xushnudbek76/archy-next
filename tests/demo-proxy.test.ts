import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { forwardAuthRequest } from '../api/auth-proxy.ts';
import { isUser } from '../libs/types/auth.ts';
let base = '';
let path = '';
const server = createServer((request, response) => {
  path = request.url ?? '';
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Set-Cookie', 'sessionid=demo-session; HttpOnly; Path=/');
  response.end(JSON.stringify({ available: true }));
});
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(() => new Promise<void>((resolve) => server.close(() => resolve())));
test('demo availability is forwarded only to its fixed read endpoint', async () => {
  const response = await forwardAuthRequest(
    new Request('http://localhost:3000/api/auth/demo-status'),
    'demo-status',
    { apiBaseUrl: base, appOrigin: 'http://localhost:3000' },
  );
  assert.equal(response.status, 200);
  assert.equal(path, '/v1/demo');
  assert.deepEqual(await response.json(), { available: true });
});
test('demo entry rejects cross-origin writes and forwards session cookies', async () => {
  const make = (origin: string) =>
    new Request('http://localhost:3000/api/auth/demo', {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-CSRFToken': 'signed-csrf',
      },
      body: '{}',
    });
  const config = { apiBaseUrl: base, appOrigin: 'http://localhost:3000' };
  assert.equal(
    (await forwardAuthRequest(make('http://attacker.example'), 'demo', config))
      .status,
    403,
  );
  const response = await forwardAuthRequest(
    make(config.appOrigin),
    'demo',
    config,
  );
  assert.equal(response.status, 200);
  assert.equal(path, '/v1/demo/session');
  assert.match(response.headers.get('Set-Cookie') ?? '', /HttpOnly/);
});
test('identity accepts a boolean demo flag and rejects forged flag types', () => {
  const user = {
    id: '254477df-1d64-5d68-900f-dcbb4400de12',
    email: 'demo@archy.example',
    displayName: 'Archy demo',
    role: 'USER',
  };
  assert.equal(isUser({ ...user, isDemo: true }), true);
  assert.equal(isUser({ ...user, isDemo: 'true' }), false);
});
