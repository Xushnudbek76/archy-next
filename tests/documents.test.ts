import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDocument,
  isDocumentDetail,
  isDocumentPage,
} from '../libs/types/documents.ts';
import { forwardDocumentRequest } from '../api/documents-proxy.ts';

const id = '11111111-1111-4111-8111-111111111111';
const document = {
  id,
  title: 'Lecture one',
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

test('document guards reject malformed references and private-path-shaped metadata', () => {
  assert.equal(isDocument(document), true);
  assert.equal(isDocument({ ...document, courseId: '../foreign' }), false);
  assert.equal(isDocument({ ...document, hasPdf: true }), false);
  assert.equal(isDocumentDetail({ ...document, text: 'English 한국어' }), true);
  assert.equal(isDocumentDetail({ ...document, text: 42 }), false);
  assert.equal(
    isDocumentPage({
      items: [document],
      total: 1,
      page: 1,
      pageSize: 20,
      nextPage: null,
      previousPage: null,
    }),
    true,
  );
  assert.equal(
    isDocumentPage({
      items: [document],
      total: -1,
      page: 1,
      pageSize: 20,
      nextPage: null,
      previousPage: null,
    }),
    false,
  );
});

test('document proxy rejects unknown, repeated and malformed paths before forwarding', async () => {
  for (const path of [
    '?page=0',
    '?page=1&page=2',
    '?ownerId=somebody',
    '?courseId=foreign',
    '?q=' + 'a'.repeat(101),
  ]) {
    const response = await forwardDocumentRequest(
      new Request('https://archy.test/api/documents' + path),
      [],
    );
    assert.equal(response.status, 400);
  }
  const response = await forwardDocumentRequest(
    new Request('https://archy.test/api/documents/nope'),
    ['nope'],
  );
  assert.equal(response.status, 404);
});
