import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { setTimeout as delay } from 'node:timers/promises';
import {
  forwardRecordingRequest,
  forwardUploadRequest,
} from '../api/recordings-proxy.ts';
const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
const origin = 'http://localhost:3000';
let base = '';
let last = {
  cookie: '',
  offset: '',
  data: Buffer.alloc(0),
  path: '',
  range: '',
  method: '',
};
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  last = {
    cookie: req.headers.cookie ?? '',
    offset: String(req.headers['upload-offset'] ?? ''),
    data: Buffer.concat(chunks),
    path: req.url!,
    range: req.headers.range ?? '',
    method: req.method ?? '',
  };
  if (req.url?.endsWith('/audio')) {
    if (
      !req.headers.range ||
      req.headers.range.includes(',') ||
      req.headers.range === 'invalid'
    ) {
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': '10',
        'Accept-Ranges': 'bytes',
      });
      return res.end('0123456789');
    }
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
  if (last.data.toString() === 'busy') {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': '3',
    });
    return res.end('{"code":"rate_limited","message":"Try later."}');
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
test('a complete 4 MiB raw chunk is accepted', async () => {
  const response = await forwardUploadRequest(
    chunk(new Uint8Array(4194304)),
    [id, 'chunks'],
    config(),
  );
  assert.equal(response.status, 200);
  assert.equal(last.data.length, 4194304);
});
test('declared oversize is rejected before reading the body', async () => {
  let reads = 0;
  const body = new ReadableStream(
    {
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request(`${origin}/api/uploads/${id}/chunks`, {
    method: 'PATCH',
    headers: chunk('1', { 'Content-Length': '4194305' }).headers,
    body,
    duplex: 'half',
  } as RequestInit);
  assert.equal(
    (await forwardUploadRequest(request, [id, 'chunks'], config())).status,
    413,
  );
  assert.equal(reads, 0);
});
test('chunk 429 preserves Retry-After for the browser', async () => {
  const response = await forwardUploadRequest(
    chunk('busy'),
    [id, 'chunks'],
    config(),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '3');
});
test('continuously progressing bodies can take longer than 150 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let source!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      source = controller;
    },
  });
  const request = new Request(`${origin}/api/uploads/${id}/chunks`, {
    method: 'PATCH',
    headers: chunk('1').headers,
    body,
    duplex: 'half',
  } as RequestInit);
  const result = forwardUploadRequest(request, [id, 'chunks'], config());
  for (let index = 0; index < 16; index++) {
    t.mock.timers.tick(10000);
    try {
      source.enqueue(new Uint8Array([index]));
    } catch {
      break;
    }
    await nextTurn();
  }
  source.close();
  assert.equal((await result).status, 200);
});
test('an idle body is cancelled with 408', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request(`${origin}/api/uploads/${id}/chunks`, {
    method: 'PATCH',
    headers: chunk('1').headers,
    body,
    duplex: 'half',
  } as RequestInit);
  const result = forwardUploadRequest(request, [id, 'chunks'], config());
  t.mock.timers.tick(15000);
  await nextTurn();
  const timed = await Promise.race([result, nextTurn().then(() => null)]);
  assert.equal(timed?.status, 408);
  assert.equal(cancelled, true);
  t.mock.timers.tick(120000);
  await result;
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

test('bounded malformed and multiple ranges reach the backend for a full response', async () => {
  for (const range of ['invalid', 'bytes=0-1,8-9']) {
    const response = await forwardRecordingRequest(
      new Request(`${origin}/api/recordings/${id}/audio`, {
        headers: { Range: range },
      }),
      [id, 'audio'],
      config(),
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '0123456789');
    assert.equal(response.headers.get('Content-Range'), null);
    assert.equal(last.range, range);
  }
});
test('oversized ranges and HEAD request a full representation', async () => {
  for (const request of [
    new Request(`${origin}/api/recordings/${id}/audio`, {
      headers: { Range: 'bytes=' + '1'.repeat(101) + '-' },
    }),
    new Request(`${origin}/api/recordings/${id}/audio`, {
      method: 'HEAD',
      headers: { Range: 'bytes=2-5' },
    }),
  ]) {
    const response = await forwardRecordingRequest(
      request,
      [id, 'audio'],
      config(),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Length'), '10');
    assert.equal(last.range, '');
    assert.equal(
      await response.text(),
      request.method === 'HEAD' ? '' : '0123456789',
    );
  }
});
