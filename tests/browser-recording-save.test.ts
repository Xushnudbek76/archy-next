import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BrowserRecordingSave,
  recordedAudioFile,
} from '../api/browser-recording.ts';
import type { Upload } from '../libs/types/recordings.ts';

const id = '73f0a264-3fcb-460a-a4ec-59d849a3f6ae';
const recording = {
  id,
  courseId: id,
  courseTitle: 'Physics',
  title: 'Lecture',
  sizeBytes: 5,
  durationSeconds: 1,
  contentType: 'audio/webm',
  createdAt: '2026-10-11T00:00:00Z',
};
const upload: Upload = {
  id,
  courseId: id,
  courseTitle: 'Physics',
  title: 'Lecture',
  fileName: 'lecture.webm',
  sizeBytes: 5,
  uploadedBytes: 0,
  sha256: '0'.repeat(64),
  status: 'UPLOADING',
  errorCode: '',
  chunkBytes: 4,
  maxDurationSeconds: 1200,
  recording: null,
  createdAt: '2026-10-11T00:00:00Z',
};

test('recorded audio preserves the negotiated MIME and matching upload extension', () => {
  const file = recordedAudioFile(new Blob(['audio'], { type: 'audio/mp4' }));
  assert.equal(file.type, 'audio/mp4');
  assert.match(file.name, /\.m4a$/);
  assert.match(
    recordedAudioFile(new Blob(['audio'], { type: 'audio/ogg;codecs=opus' }))
      .name,
    /\.ogg$/,
  );
  assert.match(
    recordedAudioFile(new Blob(['audio'], { type: 'audio/webm;codecs=opus' }))
      .name,
    /\.webm$/,
  );
});

test('browser audio uses checksummed admission and completed upload before document PATCH', async () => {
  const steps: string[] = [];
  let attached: unknown;
  const save = new BrowserRecordingSave(
    recordedAudioFile(new Blob(['audio'], { type: 'audio/webm' })),
    id,
    id,
    ' Lecture ',
    {
      hash: async (file) => {
        assert.equal(await file.text(), 'audio');
        steps.push('checksum');
        return 'a'.repeat(64);
      },
      create: async (data) => {
        assert.equal(data.sha256, 'a'.repeat(64));
        assert.equal(data.sizeBytes, 5);
        assert.equal(data.courseId, id);
        assert.equal(data.title, 'Lecture');
        steps.push('admission');
        return upload;
      },
      transfer: async (file, current) => {
        assert.equal(await file.text(), 'audio');
        assert.equal(current.id, id);
        steps.push('chunks-and-validation');
        return { ...upload, status: 'ACCEPTED', recording };
      },
      attach: async (documentId, patch) => {
        assert.equal(documentId, id);
        attached = patch;
        steps.push('attach');
      },
    },
  );
  await save.save(new AbortController().signal, () => {});
  assert.deepEqual(steps, [
    'checksum',
    'admission',
    'chunks-and-validation',
    'attach',
  ]);
  assert.deepEqual(attached, { recordingId: id });
});

test('an upload without an accepted recording never changes the document', async () => {
  const save = new BrowserRecordingSave(
    new File(['audio'], 'lecture.webm'),
    id,
    id,
    'Lecture',
    {
      hash: async () => 'a'.repeat(64),
      create: async () => upload,
      transfer: async () => ({ ...upload, status: 'FAILED' }),
      attach: async () => {
        assert.fail('must not attach invalid audio');
      },
    },
  );
  await assert.rejects(
    save.save(new AbortController().signal, () => {}),
    /validated/,
  );
});

test('missing course and oversized recording titles are rejected before admission', () => {
  assert.throws(
    () =>
      new BrowserRecordingSave(
        new File(['x'], 'lecture.webm'),
        id,
        '',
        'Lecture',
      ),
    /course/,
  );
  assert.throws(
    () =>
      new BrowserRecordingSave(
        new File(['x'], 'lecture.webm'),
        id,
        id,
        '한'.repeat(101),
      ),
    /title/,
  );
});

test('lost admission responses retry the same identity and immutable audio', async () => {
  const admissions: string[] = [];
  let hashCalls = 0;
  const save = new BrowserRecordingSave(
    new File(['audio'], 'lecture.webm'),
    id,
    id,
    'Lecture',
    {
      hash: async () => {
        hashCalls++;
        return 'a'.repeat(64);
      },
      create: async (data) => {
        admissions.push(data.id);
        if (admissions.length === 1) throw new Error('lost response');
        return upload;
      },
      transfer: async () => ({ ...upload, status: 'ACCEPTED', recording }),
      attach: async () => {},
    },
  );
  await assert.rejects(
    save.save(new AbortController().signal, () => {}),
    /lost response/,
  );
  await save.save(new AbortController().signal, () => {});
  assert.equal(admissions.length, 2);
  assert.equal(admissions[0], admissions[1]);
  assert.equal(hashCalls, 1);
});

test('a failed document attach retries the saved recording without transferring audio again', async () => {
  let transfers = 0;
  let attaches = 0;
  const save = new BrowserRecordingSave(
    new File(['audio'], 'lecture.webm'),
    id,
    id,
    'Lecture',
    {
      hash: async () => 'a'.repeat(64),
      create: async () => upload,
      transfer: async () => {
        transfers++;
        return { ...upload, status: 'ACCEPTED', recording };
      },
      attach: async () => {
        if (++attaches === 1)
          throw new Error('document temporarily unavailable');
      },
    },
  );
  await assert.rejects(save.save(new AbortController().signal, () => {}));
  await save.save(new AbortController().signal, () => {});
  assert.equal(transfers, 1);
  assert.equal(attaches, 2);
});

test('aborting a transfer keeps the same Blob and upload for resume', async () => {
  const abort = new AbortController();
  let attempts = 0;
  let admissions = 0;
  let retainedFile: File | null = null;
  const save = new BrowserRecordingSave(
    new File(['audio'], 'lecture.webm'),
    id,
    id,
    'Lecture',
    {
      hash: async () => 'a'.repeat(64),
      create: async () => {
        admissions++;
        return upload;
      },
      transfer: async (file, _upload, signal) => {
        if (++attempts === 1) {
          retainedFile = file;
          abort.abort();
          signal.throwIfAborted();
        }
        assert.equal(file, retainedFile);
        return { ...upload, status: 'ACCEPTED', recording };
      },
      attach: async () => {},
    },
  );
  await assert.rejects(
    save.save(abort.signal, () => {}),
    { name: 'AbortError' },
  );
  await save.save(new AbortController().signal, () => {});
  assert.equal(admissions, 1);
  assert.equal(attempts, 2);
});
