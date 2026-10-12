import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
test('processing proxy permits only private read routes', async () => {
  const { forwardProcessingRequest } =
    await import('../api/processing-proxy.ts');
  let seen = '';
  const server = createServer((request, response) => {
    seen = `${request.url}|${request.headers.cookie}`;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ status: 'queued' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const config = {
    apiBaseUrl: `http://127.0.0.1:${address.port}`,
    appOrigin: 'http://localhost:3000',
  };
  try {
    const response = await forwardProcessingRequest(
      new Request(`http://localhost:3000/api/processing/${id}`, {
        headers: { Cookie: 'sessionid=session; private=secret' },
      }),
      [id],
      config,
    );
    assert.equal(response.status, 200);
    assert.equal(seen, `/v1/recordings/${id}/processing|sessionid=session`);
    assert(response.headers.get('Cache-Control')?.includes('no-store'));
    assert.equal(
      (
        await forwardProcessingRequest(
          new Request(`http://localhost:3000/api/processing/${id}`, {
            method: 'POST',
          }),
          [id],
          config,
        )
      ).status,
      405,
    );
    assert.equal(
      (
        await forwardProcessingRequest(
          new Request(`http://localhost:3000/api/processing/${id}?retry=true`),
          [id],
          config,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await forwardProcessingRequest(
          new Request('http://localhost:3000/api/processing/x'),
          ['x'],
          config,
        )
      ).status,
      404,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('processing guards distinguish unavailable results and reject malformed provider data', async () => {
  const { isProcessingStatus, isTranscriptResult, isNoteResult, shouldPoll } =
    await import('../libs/types/processing.ts');
  const state = {
    status: 'unavailable',
    language: null,
    transcriptAvailable: false,
    notesAvailable: false,
    errorCode: '',
    deferred: false,
    updatedAt: null,
  };
  assert(isProcessingStatus(state));
  assert.equal(shouldPoll(state), false);
  assert.equal(shouldPoll({ ...state, status: 'queued' }), true);
  assert.equal(isProcessingStatus({ ...state, status: 'finished' }), false);
  assert(isTranscriptResult({ available: false }));
  assert.equal(
    isTranscriptResult({
      available: true,
      data: {
        text: 'Lecture',
        segments: [{ start: 2, end: 1, text: 'wrong' }],
      },
    }),
    false,
  );
  assert.equal(
    isNoteResult({
      available: true,
      data: { overview: 'text', examples: 'bad' },
    }),
    false,
  );
});

test('transcript limits count Unicode characters consistently with backend validation', async () => {
  const { isTranscriptResult } = await import('../libs/types/processing.ts');
  assert(
    isTranscriptResult({
      available: true,
      language: 'en',
      provider: 'fixture',
      model: 'synthetic',
      data: {
        text: '😀'.repeat(100001),
        segments: [{ start: 0, end: 1, text: 'Lecture.' }],
      },
    }),
  );
});
