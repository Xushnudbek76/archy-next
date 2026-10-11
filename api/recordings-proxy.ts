import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
import { forwardAudio, forwardChunk } from './media-proxy.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errorMessages = {
  invalid_audio: 'Use a valid MP3, M4A, WAV, FLAC, Ogg or WebM audio file.',
  checksum_mismatch:
    'The file changed during upload. Please select it and start again.',
  upload_conflict: 'Refresh the upload status before continuing.',
  invalid_chunk: 'The audio chunk could not be accepted.',
  storage_full: 'There is not enough server storage for this file.',
};
function invalidQuery() {
  return Response.json(
    { code: 'invalid_request', message: 'Check the request fields.' },
    { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
function validQuery(request: Request, parts: string[]) {
  const query = new URL(request.url).searchParams;
  return (
    query.size === 0 ||
    (parts.length === 0 &&
      request.method === 'GET' &&
      query.size === 1 &&
      query.getAll('page').length === 1 &&
      /^[1-9]\d{0,8}$/.test(query.get('page')!))
  );
}
export function forwardUploadRequest(
  request: Request,
  parts: string[],
  supplied?: AuthConfiguration,
) {
  if (!validQuery(request, parts)) return Promise.resolve(invalidQuery());
  if (parts.length === 2 && uuid.test(parts[0]!) && parts[1] === 'chunks')
    return forwardChunk(request, parts[0]!, supplied);
  let route:
    | {
        path: string;
        method: string;
        timeoutMs?: number;
        errorMessages: typeof errorMessages;
      }
    | undefined;
  const query = new URL(request.url).search;
  if (!parts.length)
    route = {
      path: `/v1/uploads${query}`,
      method: request.method === 'POST' ? 'POST' : 'GET',
      errorMessages,
    };
  else if (parts.length === 1 && uuid.test(parts[0]!))
    route = { path: `/v1/uploads/${parts[0]}`, method: 'GET', errorMessages };
  else if (
    parts.length === 2 &&
    uuid.test(parts[0]!) &&
    ['complete', 'cancel'].includes(parts[1]!)
  )
    route = {
      path: `/v1/uploads/${parts.join('/')}`,
      method: 'POST',
      timeoutMs: parts[1] === 'complete' ? 90000 : undefined,
      errorMessages,
    };
  return forwardJsonRequest(request, route, supplied);
}
export function forwardRecordingRequest(
  request: Request,
  parts: string[],
  supplied?: AuthConfiguration,
) {
  if (!validQuery(request, parts)) return Promise.resolve(invalidQuery());
  if (parts.length === 2 && uuid.test(parts[0]!) && parts[1] === 'audio')
    return forwardAudio(request, parts[0]!, supplied);
  return forwardJsonRequest(
    request,
    parts.length === 0
      ? { path: `/v1/recordings${new URL(request.url).search}`, method: 'GET' }
      : undefined,
    supplied,
  );
}
