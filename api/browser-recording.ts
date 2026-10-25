import { createUpload, hashFile, transferUpload } from './recordings-client.ts';
import { updateDocument } from './documents-client.ts';
import type { Upload } from '../libs/types/recordings.ts';

export function recordedAudioFile(blob: Blob): File {
  const extension = blob.type.includes('mp4')
    ? 'm4a'
    : blob.type.includes('ogg')
      ? 'ogg'
      : 'webm';
  return new File([blob], `lecture-recording.${extension}`, {
    type: blob.type,
  });
}

type SaveTransport = {
  hash: typeof hashFile;
  create: typeof createUpload;
  transfer: typeof transferUpload;
  attach: (id: string, patch: { recordingId: string }) => Promise<unknown>;
};
export type RecordingSaveProgress = {
  phase: 'checking' | 'uploading' | 'verifying' | 'attaching';
  bytes: number;
  total: number;
};

// The same immutable file and admission identity are kept for resumable uploads.
export class BrowserRecordingSave {
  private file: File;
  private documentId: string;
  private courseId: string;
  private title: string;
  private id = crypto.randomUUID();
  private checksum: string | null = null;
  private upload: Upload | null = null;
  private transport: SaveTransport;

  constructor(
    file: File,
    documentId: string,
    courseId: string,
    title: string,
    transport: SaveTransport = {
      hash: hashFile,
      create: createUpload,
      transfer: transferUpload,
      attach: updateDocument,
    },
  ) {
    if (!courseId)
      throw new Error('Choose a course for this document before saving.');
    if (!title.trim() || [...title.trim()].length > 100)
      throw new Error('Use a recording title between 1 and 100 characters.');
    if (!file.size) throw new Error('Record some audio before saving.');
    this.file = file;
    this.documentId = documentId;
    this.courseId = courseId;
    this.title = title.trim();
    this.transport = transport;
  }

  async save(
    signal: AbortSignal,
    progress: (value: RecordingSaveProgress) => void,
  ) {
    const report = (phase: RecordingSaveProgress['phase'], bytes: number) =>
      progress({ phase, bytes, total: this.file.size });
    signal.throwIfAborted();
    report('checking', 0);
    this.checksum ??= await this.transport.hash(this.file, signal, (bytes) =>
      report('checking', bytes),
    );
    signal.throwIfAborted();
    this.upload ??= await this.transport.create(
      {
        id: this.id,
        courseId: this.courseId,
        title: this.title,
        fileName: this.file.name,
        sizeBytes: this.file.size,
        sha256: this.checksum,
      },
      signal,
    );
    signal.throwIfAborted();
    report('uploading', this.upload.uploadedBytes);
    this.upload = await this.transport.transfer(
      this.file,
      this.upload,
      signal,
      (bytes, current) =>
        report(
          current?.uploadedBytes === current?.sizeBytes && current
            ? 'verifying'
            : 'uploading',
          bytes,
        ),
    );
    if (this.upload.status !== 'ACCEPTED' || !this.upload.recording)
      throw new Error(
        'The recording has not been validated yet. Please retry saving.',
      );
    signal.throwIfAborted();
    report('attaching', this.file.size);
    await this.transport.attach(this.documentId, {
      recordingId: this.upload.recording.id,
    });
    return this.upload.recording;
  }
}
