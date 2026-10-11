import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  forwardRecordingRequest,
  forwardUploadRequest,
} from '../api/recordings-proxy.ts';
const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
const origin = 'http://localhost:3000';
let base = '';
let last = { cookie: '', offset: '', data: Buffer.alloc(0), path: '' };
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  last = {
    cookie: req.headers.cookie ?? '',
    offset: String(req.headers['upload-offset'] ?? ''),
    data: Buffer.concat(chunks),
    path: req.url!,
  };
  if (req.url?.endsWith('/audio')) {
    if (req.headers.range === 'bytes=99-') {
      res.writeHead(416, {
        'Content-Type': 'application/json',
        'Content-Range': 'bytes */10',
        'Content-Length': '2',
      });
      return res.end('{}');
    }
    if (req.headers.range === 'bytes=6-9') {
      res.writeHead(206, {
        'Content-Type': 'audio/wav',
        'Content-Range': 'bytes 6-9/10',
        'Content-Length': '4',
      });
      res.write('6');
      await delay(6000);
      return res.end('789');
    }

    res.writeHead(206, {
      'Content-Type': 'audio/wav',
      'Content-Range': 'bytes 2-5/10',
      'Content-Length': '4',
      'Accept-Ranges': 'bytes',
    });
    return res.end('2345');
  }
  res.setHeader('Content-Type', 'application/json');
  res.end('{"uploadedBytes":4}');
});
before(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));
const config = () => ({ apiBaseUrl: base, appOrigin: origin });
function chunk(body: Uint8Array | string, extra: Record<string, string> = {}) {
  return new Request(`${origin}/api/uploads/${id}/chunks`, {
    method: 'PATCH',
    headers: {
      Origin: origin,
      'Content-Type': 'application/octet-stream',
      'Upload-Offset': '0',
      'X-CSRFToken': 'csrf',
      Cookie: 'sessionid=session; csrftoken=csrf; private=tracking',
      ...extra,
    },
    body: typeof body === 'string' ? body : Buffer.from(body),
  });
}
test('binary transport preserves bounded bytes and only session cookies', async () => {
  const response = await forwardUploadRequest(
    chunk('1234'),
    [id, 'chunks'],
    config(),
  );
  assert.equal(response.status, 200);
  assert.equal(last.data.toString(), '1234');
  assert.equal(last.path, `/v1/uploads/${id}/chunks`);
  assert.equal(last.offset, '0');
  assert.equal(last.cookie, 'sessionid=session; csrftoken=csrf');
});
test('binary transport rejects oversize bodies, hostile origins and malformed offsets', async () => {
  assert.equal(
    (
      await forwardUploadRequest(
        chunk(new Uint8Array(4 * 1024 * 1024 + 1)),
        [id, 'chunks'],
        config(),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await forwardUploadRequest(
        chunk('1234', { Origin: 'https://hostile.example' }),
        [id, 'chunks'],
        config(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await forwardUploadRequest(
        chunk('1234', { 'Upload-Offset': '-1' }),
        [id, 'chunks'],
        config(),
      )
    ).status,
    400,
  );
});
test('audio playback streams allowlisted range responses privately', async () => {
  const response = await forwardRecordingRequest(
    new Request(`${origin}/api/recordings/${id}/audio`, {
      headers: {
        Range: 'bytes=2-5',
        Cookie: 'sessionid=session; private=tracking',
      },
    }),
    [id, 'audio'],
    config(),
  );
  assert.equal(response.status, 206);
  assert.equal(await response.text(), '2345');
  assert.equal(response.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(last.cookie, 'sessionid=session');
  assert(response.headers.get('Cache-Control')?.includes('no-store'));
  assert.equal(
    (
      await forwardRecordingRequest(
        new Request(`${origin}/api/recordings/../../admin`),
        ['../admin'],
        config(),
      )
    ).status,
    404,
  );
});

test('invalid audio ranges preserve size without advertising a missing response body', async () => {
  const response = await forwardRecordingRequest(
    new Request(`${origin}/api/recordings/${id}/audio`, {
      headers: { Range: 'bytes=99-' },
    }),
    [id, 'audio'],
    config(),
  );
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('Content-Range'), 'bytes */10');
  assert.equal(response.headers.get('Content-Length'), null);
  assert.equal(await response.text(), '');
});
test('audio streaming stays open after the connection deadline has elapsed', async () => {
  const response = await forwardRecordingRequest(
    new Request(`${origin}/api/recordings/${id}/audio`, {
      headers: { Range: 'bytes=6-9' },
    }),
    [id, 'audio'],
    config(),
  );
  assert.equal(response.status, 206);
  assert.equal(await response.text(), '6789');
});
