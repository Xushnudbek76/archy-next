import { sha256 } from '@noble/hashes/sha2.js';
import { ApiError, jsonRequest } from './json-client.ts';
import {
  isPage,
  isRecording,
  isUpload,
  type Upload,
} from '../libs/types/recordings.ts';

function invalid(): never {
  throw new ApiError(
    503,
    'unavailable',
    'Recording data is temporarily unavailable.',
  );
}
export async function listRecordings(page = 1) {
  const value = await jsonRequest(`/api/recordings?page=${page}`);
  return isPage(value, isRecording) ? value : invalid();
}
export async function listUploads(page = 1) {
  const value = await jsonRequest(`/api/uploads?page=${page}`);
  return isPage(value, isUpload) ? value : invalid();
}
export async function readUpload(id: string) {
  const value = await jsonRequest(`/api/uploads/${id}`);
  return isUpload(value) ? value : invalid();
}
export async function createUpload(
  data: {
    id: string;
    courseId: string;
    title: string;
    fileName: string;
    sizeBytes: number;
    sha256: string;
  },
  signal?: AbortSignal,
) {
  const value = await jsonRequest('/api/uploads', data, 'POST', { signal });
  return isUpload(value) ? value : invalid();
}
export async function cancelUpload(id: string) {
  const value = await jsonRequest(`/api/uploads/${id}/cancel`, {});
  return isUpload(value) ? value : invalid();
}
export async function hashFile(
  file: File,
  signal: AbortSignal,
  progress: (bytes: number) => void,
) {
  const hash = sha256.create();
  try {
    for (let offset = 0; offset < file.size; offset += 4 * 1024 * 1024) {
      signal.throwIfAborted();
      const block = new Uint8Array(
        await file.slice(offset, offset + 4 * 1024 * 1024).arrayBuffer(),
      );
      signal.throwIfAborted();
      hash.update(block);
      progress(Math.min(file.size, offset + block.byteLength));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return Array.from(hash.digest(), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  } finally {
    hash.destroy();
  }
}
async function sendChunk(
  id: string,
  offset: number,
  body: Blob,
  signal: AbortSignal,
  progress: (bytes: number) => void,
): Promise<Upload> {
  const csrf = await jsonRequest('/api/auth/csrf', undefined, 'POST', {
    signal,
  });
  if (
    !csrf ||
    typeof csrf !== 'object' ||
    !('csrfToken' in csrf) ||
    typeof csrf.csrfToken !== 'string'
  )
    return invalid();
  const csrfToken = csrf.csrfToken;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = () => signal.removeEventListener('abort', abort);
    xhr.open('PATCH', `/api/uploads/${id}/chunks`);
    xhr.timeout = 150000;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-CSRFToken', csrfToken);
    xhr.setRequestHeader('Upload-Offset', String(offset));
    xhr.upload.onprogress = (event) => progress(offset + event.loaded);
    xhr.onload = () => {
      finish();
      let value: unknown;
      try {
        value = JSON.parse(xhr.responseText);
      } catch {
        return reject(new ApiError(503, 'unavailable', 'Upload unavailable.'));
      }
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(
          new ApiError(xhr.status, 'upload_failed', 'Upload interrupted.'),
        );
      return isUpload(value)
        ? resolve(value)
        : reject(new ApiError(503, 'unavailable', 'Upload unavailable.'));
    };
    xhr.onerror = xhr.ontimeout = () => {
      finish();
      reject(new ApiError(503, 'unavailable', 'Upload interrupted.'));
    };
    xhr.onabort = () => {
      finish();
      reject(signal.reason ?? new DOMException('Paused', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      finish();
      return reject(signal.reason);
    }
    xhr.send(body);
  });
}
async function finishUpload(id: string, signal: AbortSignal): Promise<Upload> {
  const value = await jsonRequest(`/api/uploads/${id}/complete`, {}, 'POST', {
    signal,
    timeoutMs: 100000,
  });
  return isUpload(value) ? value : invalid();
}
type Transfer = {
  read: (id: string) => Promise<Upload>;
  chunk: (
    id: string,
    offset: number,
    body: Blob,
    signal: AbortSignal,
    progress: (bytes: number) => void,
  ) => Promise<Upload>;
  complete: (id: string, signal: AbortSignal) => Promise<Upload>;
};
export async function transferUpload(
  file: File,
  upload: Upload,
  signal: AbortSignal,
  progress: (bytes: number, state?: Upload) => void,
  transport: Transfer = {
    read: readUpload,
    chunk: sendChunk,
    complete: finishUpload,
  },
): Promise<Upload> {
  let current = await transport.read(upload.id);
  signal.throwIfAborted();
  if (current.status === 'ACCEPTED') return current;
  if (current.status === 'FAILED')
    throw new ApiError(
      400,
      current.errorCode,
      'This upload failed validation.',
    );
  if (current.status !== 'UPLOADING')
    throw new ApiError(
      409,
      'upload_closed',
      'This upload is no longer active.',
    );
  if (file.size !== current.sizeBytes)
    throw new ApiError(400, 'wrong_file', 'Select the original audio file.');
  while (current.uploadedBytes < current.sizeBytes) {
    signal.throwIfAborted();
    const offset = current.uploadedBytes;
    const part = file.slice(offset, offset + current.chunkBytes);
    current = await transport.chunk(current.id, offset, part, signal, progress);
    if (current.uploadedBytes !== offset + part.size)
      throw new ApiError(
        409,
        'upload_conflict',
        'Refresh the upload before continuing.',
      );
    progress(current.uploadedBytes, current);
  }
  signal.throwIfAborted();
  progress(current.sizeBytes, current);
  return transport.complete(current.id, signal);
}
export function recordingError(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'Upload interrupted. Resume when you are ready.';
  if ([401, 403].includes(error.status))
    return 'Your session expired. Sign in again to continue.';
  if (error.code === 'invalid_audio')
    return 'Use a valid MP3, M4A, WAV, FLAC, Ogg or WebM audio file.';
  if (error.code === 'checksum_mismatch')
    return 'The file changed during upload. Select it and start a new upload.';
  if (error.code === 'upload_closed')
    return 'This upload is no longer active. Start a new upload.';
  if (error.code === 'wrong_file')
    return 'Select the same audio file used to start this upload.';
  if (error.status === 507)
    return 'There is not enough server storage for this audio file.';
  if (error.status === 404)
    return 'This upload or course is no longer available. Refresh the page.';
  if (error.status === 400) return 'Check the title, course and audio file.';
  return 'Upload interrupted. Your saved progress is kept; resume when you are ready.';
}
