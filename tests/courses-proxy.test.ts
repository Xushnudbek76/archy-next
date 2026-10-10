import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { forwardCourseRequest } from '../api/courses-proxy.ts';

const origin = 'http://localhost:3000';
const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
let base = '';
let last = { path: '', method: '', csrf: '', cookie: '' };
const server = createServer(async (req, res) => {
  for await (const _ of req) void _;
  last = {
    path: req.url!,
    method: req.method!,
    csrf: String(req.headers['x-csrftoken'] ?? ''),
    cookie: req.headers.cookie ?? '',
  };
  res.setHeader('Content-Type', 'application/json');
  res.end('{"id":"course"}');
});
before(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));
function request(
  path: string,
  method = 'GET',
  extra: Record<string, string> = {},
) {
  return new Request(`${origin}/api/courses${path}`, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: 'sessionid=session; csrftoken=csrf; tracking=private',
      'X-CSRFToken': 'csrf',
      ...extra,
    },
    body: method === 'GET' ? undefined : '{"title":"Calculus"}',
  });
}
const config = () => ({ apiBaseUrl: base, appOrigin: origin });

test('course list forwards only allowlisted query parameters and session cookies', async () => {
  const response = await forwardCourseRequest(
    request('?archived=true&page=2'),
    [],
    config(),
  );
  assert.equal(response.status, 200);
  assert.equal(last.path, '/v1/courses?archived=true&page=2');
  assert.equal(last.cookie, 'sessionid=session; csrftoken=csrf');
  assert(response.headers.get('Cache-Control')?.includes('no-store'));
});
test('create, rename and archive use fixed paths, verbs and CSRF headers', async () => {
  for (const [parts, method, path] of [
    [[], 'POST', '/v1/courses'],
    [[id], 'PATCH', `/v1/courses/${id}`],
    [[id, 'archive'], 'POST', `/v1/courses/${id}/archive`],
  ] as [string[], string, string][]) {
    assert.equal(
      (
        await forwardCourseRequest(
          request('/' + parts.join('/'), method),
          parts,
          config(),
        )
      ).status,
      200,
    );
    assert.equal(last.path, path);
    assert.equal(last.method, method);
    assert.equal(last.csrf, 'csrf');
  }
});
test('course proxy blocks hostile origins, unsafe paths and unsupported queries', async () => {
  assert.equal(
    (
      await forwardCourseRequest(
        request('/' + id, 'PATCH', { Origin: 'https://attacker.example' }),
        [id],
        config(),
      )
    ).status,
    403,
  );
  for (const parts of [['../admin'], [id, 'delete'], [id, 'archive', 'extra']])
    assert.equal(
      (await forwardCourseRequest(request(''), parts, config())).status,
      404,
    );
  for (const query of [
    '?owner=forged',
    '?page=1&page=2',
    '?archived=wrong',
    '?page=0',
  ])
    assert.equal(
      (await forwardCourseRequest(request(query), [], config())).status,
      400,
    );
  assert.equal(
    (await forwardCourseRequest(request('/' + id, 'POST'), [id], config()))
      .status,
    405,
  );
});
