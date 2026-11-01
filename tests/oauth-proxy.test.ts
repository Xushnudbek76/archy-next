import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { oauthCallback, forwardOAuthRequest } from '../api/oauth-proxy.ts';

let base = '';
let destination = '/dashboard';
let lastCookie = '';
let calls = 0;
const origin = 'https://archy.example';
const server = createServer(async (req, res) => {
  calls++;
  lastCookie = req.headers.cookie ?? '';
  for await (const part of req) void part;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Set-Cookie', [
    'sessionid=rotated; HttpOnly; Path=/',
    'oauth_flow=; Max-Age=0; HttpOnly; Path=/; Secure; SameSite=None',
  ]);
  res.end(JSON.stringify({ returnTo: destination }));
});
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(() => new Promise<void>((resolve) => server.close(() => resolve())));
test('OAuth callback forwards only allowed cookies and cannot redirect outside the app', async () => {
  const config = { apiBaseUrl: base, appOrigin: origin };
  const request = () =>
    new Request(
      origin + '/api/oauth/google/callback?state=bound-state&code=code',
      {
        headers: {
          Cookie:
            'oauth_flow=bound-browser; sessionid=previous; tracking=ignored',
        },
      },
    );
  destination = 'https://attacker.example';
  let response = await oauthCallback(request(), 'google', config);
  assert.equal(response.headers.get('Location'), origin + '/auth-error');
  assert.equal(response.headers.getSetCookie().length, 0);
  destination = '/dashboard';
  response = await oauthCallback(request(), 'google', config);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), origin + '/dashboard');
  assert.equal(lastCookie, 'oauth_flow=bound-browser; sessionid=previous');
  assert(response.headers.getSetCookie()[0]?.includes('Secure'));
  assert(response.headers.getSetCookie()[1]?.includes('SameSite=None'));
  assert(response.headers.get('Cache-Control')?.includes('no-store'));
});
test('OAuth callback refuses unknown providers and oversized form bodies before upstream', async () => {
  const config = { apiBaseUrl: base, appOrigin: origin };
  const previous = calls;
  await oauthCallback(
    new Request(origin + '/api/oauth/unknown/callback?state=a&code=b'),
    'unknown',
    config,
  );
  await oauthCallback(
    new Request(origin + '/api/oauth/apple/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'code=' + 'a'.repeat(17000),
    }),
    'apple',
    config,
  );
  await forwardOAuthRequest(
    new Request(origin + '/api/oauth/evil'),
    ['evil'],
    config,
  );
  assert.equal(calls, previous);
});
