import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../api/json-client.ts';
import * as recordings from '../api/recordings-client.ts';
import { isUpload } from '../libs/types/recordings.ts';

test('duration failures require a fresh upload rather than resuming', () => {
  for (const code of ['audio_too_long', 'duration_unavailable']) {
    const error = new ApiError(400, code, 'private upstream text');
    assert(recordings.isTerminalUploadError(error));
    assert.match(recordings.recordingError(error), /start a new upload/i);
    assert.doesNotMatch(
      recordings.recordingError(error),
      /resume|private upstream/,
    );
  }
  assert.equal(
    recordings.isTerminalUploadError(new ApiError(503, 'unavailable', '')),
    false,
  );
});

test('upload policy reads the configured limit and rejects malformed limits', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ maxDurationSeconds: 900 }),
  );
  assert.equal(await recordings.readUploadPolicy(), 900);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ maxDurationSeconds: 0 }),
  );
  await assert.rejects(recordings.readUploadPolicy(), ApiError);
});

test('upload duration snapshots accept legacy null and reject invalid limits', () => {
  const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
  const upload = {
    id,
    courseId: id,
    courseTitle: 'Physics',
    title: 'Lecture',
    fileName: 'lecture.wav',
    sizeBytes: 10,
    uploadedBytes: 0,
    sha256: 'a'.repeat(64),
    status: 'UPLOADING',
    errorCode: '',
    chunkBytes: 4,
    recording: null,
    createdAt: '2026-10-11T00:00:00Z',
  };
  assert(isUpload({ ...upload, maxDurationSeconds: null }));
  assert(isUpload({ ...upload, maxDurationSeconds: 1200 }));
  assert.equal(isUpload({ ...upload, maxDurationSeconds: 0 }), false);
});
