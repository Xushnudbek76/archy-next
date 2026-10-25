import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { forwardTutorStream } from '../api/tutor-stream-proxy.ts';
const id = '89e0ae43-73e9-45db-a535-dd336adec689';
const config = {
  apiBaseUrl: 'https://api.archy.test',
  appOrigin: 'https://archy.test',
};
const request = (origin = config.appOrigin) =>
  new Request(`https://archy.test/api/tutor/conversations/${id}/messages`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: 'sessionid=session; csrftoken=csrf; other=secret',
      'X-CSRFToken': 'csrf',
    },
    body: JSON.stringify({
      message: 'Explain the lecture',
      language: 'en',
      requestId: id,
    }),
  });
test('malformed tutor JSON is rejected as a client error', async () => {
  const malformed = new Request(
    `https://archy.test/api/tutor/conversations/${id}/messages`,
    {
      method: 'POST',
      headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
      body: '{',
    },
  );
  assert.equal((await forwardTutorStream(malformed, id, config)).status, 400);
});
test('tutor streaming blocks foreign origins before forwarding credentials', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not forward');
  });
  try {
    assert.equal(
      (await forwardTutorStream(request('https://foreign.test'), id, config))
        .status,
      403,
    );
    assert.equal(fetch.mock.callCount(), 0);
  } finally {
    fetch.mock.restore();
  }
});
test('stream proxy forwards only session credentials and keeps private NDJSON streaming', async () => {
  let headers: Headers | undefined;
  const fetch = mock.method(
    globalThis,
    'fetch',
    async (_url: string, init: RequestInit) => {
      headers = new Headers(init.headers);
      return new Response('{"type":"delta","text":"hi"}\n', {
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    },
  );
  try {
    const result = await forwardTutorStream(request(), id, config);
    assert.equal(result.status, 200);
    assert.match(result.headers.get('Cache-Control')!, /no-store/);
    assert.equal(headers?.get('Cookie'), 'sessionid=session; csrftoken=csrf');
    assert.equal(headers?.get('X-CSRFToken'), 'csrf');
    assert.equal(await result.text(), '{"type":"delta","text":"hi"}\n');
  } finally {
    fetch.mock.restore();
  }
});
