import assert from 'node:assert/strict';
import test from 'node:test';
import { mock } from 'node:test';
import { updateDocument, archiveDocument } from '../api/documents-client.ts';
const id = '11111111-1111-4111-8111-111111111111';
const saved = {
  id,
  title: 'Renamed lecture',
  courseId: null,
  recordingId: null,
  hasPdf: false,
  fileName: null,
  pdfSizeBytes: null,
  pageCount: null,
  archivedAt: null,
  createdAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
};
test('rename and archive use CSRF-protected document endpoints', async () => {
  const requests: Request[] = [];
  const fetch = mock.method(
    globalThis,
    'fetch',
    async (input: string, options: RequestInit) => {
      const request = new Request(
        new URL(input, 'https://archy.test'),
        options,
      );
      requests.push(request);
      return Response.json(
        input === '/api/auth/csrf' ? { csrfToken: 'test-token' } : saved,
      );
    },
  );
  try {
    assert.equal(
      (await updateDocument(id, { title: 'Renamed lecture' })).title,
      saved.title,
    );
    assert.equal(requests[1]?.method, 'PATCH');
    assert.equal(requests[1]?.headers.get('X-CSRFToken'), 'test-token');
    assert.deepEqual(await requests[1]?.json(), { title: 'Renamed lecture' });
    await archiveDocument(id);
    assert.equal(
      requests[3]?.url,
      `https://archy.test/api/documents/${id}/archive`,
    );
    assert.equal(requests[3]?.method, 'POST');
  } finally {
    fetch.mock.restore();
  }
});
