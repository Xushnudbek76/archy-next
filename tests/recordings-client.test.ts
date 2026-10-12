import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { hashFile, transferUpload } from '../api/recordings-client.ts';
import { UploadRateLimitError } from '../api/upload-retry.ts';
import { setImmediate as nextTurn } from 'node:timers/promises';

const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
const upload = {
  id,
  courseId: id,
  courseTitle: 'Physics',
  title: 'Lecture',
  fileName: 'lecture.wav',
  sizeBytes: 10,
  uploadedBytes: 4,
  sha256: '',
  status: 'UPLOADING' as const,
  errorCode: '',
  chunkBytes: 4,
  maxDurationSeconds: 1200,
  recording: null,
  createdAt: '2026-10-11T00:00:00Z',
};

test('file hashing is incremental, reports progress and has no whole-file buffer', async () => {
  const data = Buffer.alloc(5 * 1024 * 1024, 7);
  const file = new File([data], 'lecture.wav');
  file.arrayBuffer = async () => {
    throw new Error('whole-file allocation');
  };
  const progress: number[] = [];
  const digest = await hashFile(file, new AbortController().signal, (n) =>
    progress.push(n),
  );
  assert.equal(digest, createHash('sha256').update(data).digest('hex'));
  assert.equal(progress.at(-1), data.length);
  assert(progress.length > 1);
});

test('resume begins at persisted offset and never reuploads the confirmed prefix', async () => {
  const file = new File(['0123456789'], 'lecture.wav');
  const writes: { offset: number; data: string }[] = [];
  let completed = false;
  const result = await transferUpload(
    file,
    upload,
    new AbortController().signal,
    () => {},
    {
      read: async () => upload,
      chunk: async (_id, offset, body) => {
        writes.push({ offset, data: await body.text() });
        return { ...upload, uploadedBytes: offset + body.size };
      },
      complete: async () => {
        completed = true;
        return { ...upload, status: 'ACCEPTED' };
      },
    },
  );
  assert.deepEqual(writes, [
    { offset: 4, data: '4567' },
    { offset: 8, data: '89' },
  ]);
  assert(completed);
  assert.equal(result.status, 'ACCEPTED');
});

test('lost chunk responses stop writes; a later resume reads the persisted offset', async () => {
  const file = new File(['0123456789'], 'lecture.wav');
  let offset = 4;
  let writes = 0;
  const transport = {
    read: async () => ({ ...upload, uploadedBytes: offset }),
    chunk: async (_id: string, at: number, body: Blob) => {
      offset = at + body.size;
      writes++;
      if (writes === 1) throw new Error('connection lost after commit');
      return { ...upload, uploadedBytes: offset };
    },
    complete: async () => ({ ...upload, status: 'ACCEPTED' as const }),
  };
  await assert.rejects(
    transferUpload(
      file,
      upload,
      new AbortController().signal,
      () => {},
      transport,
    ),
  );
  assert.equal(offset, 8);
  await transferUpload(
    file,
    upload,
    new AbortController().signal,
    () => {},
    transport,
  );
  assert.equal(writes, 2);
  assert.equal(offset, 10);
});

test('chunk 429 retries the same bytes before proceeding', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const writes: { offset: number; data: string }[] = [];
  let attempts = 0;
  const result = transferUpload(
    new File(['0123456789'], 'lecture.wav'),
    upload,
    new AbortController().signal,
    () => {},
    {
      read: async () => upload,
      chunk: async (_id, offset, body) => {
        writes.push({ offset, data: await body.text() });
        if (++attempts < 3) throw new UploadRateLimitError(2);
        return { ...upload, uploadedBytes: offset + body.size };
      },
      complete: async () => ({ ...upload, status: 'ACCEPTED' }),
    },
  );
  await nextTurn();
  t.mock.timers.tick(2250);
  await nextTurn();
  t.mock.timers.tick(4250);
  assert.equal((await result).status, 'ACCEPTED');
  assert.deepEqual(writes, [
    { offset: 4, data: '4567' },
    { offset: 4, data: '4567' },
    { offset: 4, data: '4567' },
    { offset: 8, data: '89' },
  ]);
});

test('persistent 429 stops after three retries without completion', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let attempts = 0;
  let completed = false;
  const result = transferUpload(
    new File(['0123456789'], 'lecture.wav'),
    upload,
    new AbortController().signal,
    () => {},
    {
      read: async () => upload,
      chunk: async () => {
        attempts++;
        throw new UploadRateLimitError(2);
      },
      complete: async () => {
        completed = true;
        return { ...upload, status: 'ACCEPTED' };
      },
    },
  );
  const rejected = assert.rejects(result, UploadRateLimitError);
  for (const wait of [2250, 4250, 8250]) {
    await nextTurn();
    t.mock.timers.tick(wait);
  }
  await rejected;
  assert.equal(attempts, 4);
  assert.equal(completed, false);
});
