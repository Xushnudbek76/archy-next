import 'server-only';
import {
  authConfiguration,
  sessionCookies,
  type AuthConfiguration,
} from './json-proxy.ts';
import { documentId } from '../libs/types/documents.ts';
import { object } from '../libs/types/study.ts';
import { tutorError } from './tutor-stream-client.ts';
function failure(status: number, code = 'unavailable') {
  return Response.json(
    { code, message: tutorError(code) },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
async function input(request: Request) {
  if (
    request.headers.get('Content-Type')?.split(';')[0]?.trim() !==
    'application/json'
  )
    throw 415;
  const reader = request.body?.getReader();
  if (!reader) throw 400;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      void reader.cancel().catch(() => {});
      reject(400);
    }, 10000);
  });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) throw 413;
      chunks.push(chunk.value);
    }
    let value: unknown;
    try {
      value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw 400;
    }
    if (
      !object(value) ||
      typeof value.message !== 'string' ||
      !value.message.trim() ||
      Array.from(value.message).length > 2000 ||
      !['en', 'ko'].includes(String(value.language)) ||
      !documentId(value.requestId) ||
      Object.keys(value).some(
        (k) => !['message', 'language', 'requestId'].includes(k),
      )
    )
      throw 400;
    return JSON.stringify(value);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function forwardTutorStream(
  request: Request,
  id: string,
  supplied?: AuthConfiguration,
): Promise<Response> {
  if (!documentId(id) || new URL(request.url).search) return failure(404);
  if (request.method !== 'POST') return failure(405);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const config = supplied ?? authConfiguration();
    if (request.headers.get('Origin') !== config.appOrigin) return failure(403);
    const body = await input(request);
    timer = setTimeout(() => controller.abort(), 75000);
    const upstream = await fetch(
      `${config.apiBaseUrl}/v1/conversations/${id}/messages`,
      {
        method: 'POST',
        cache: 'no-store',
        redirect: 'manual',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
          Cookie: sessionCookies(request.headers.get('Cookie')),
          Origin: config.appOrigin,
          'X-CSRFToken': request.headers.get('X-CSRFToken') ?? '',
        },
        body,
        signal: AbortSignal.any([request.signal, controller.signal]),
      },
    );
    if (!upstream.ok) {
      clearTimeout(timer);
      const value: unknown = await upstream.json().catch(() => null);
      const codes = [
        'tutor_unavailable',
        'tutor_busy',
        'quota_wait',
        'tutor_timeout',
        'tutor_provider_unavailable',
        'invalid_provider_output',
        'sources_changed',
        'request_conflict',
      ];
      const code =
        object(value) && codes.includes(String(value.code))
          ? String(value.code)
          : 'unavailable';
      return failure(
        [400, 401, 403, 404, 409, 429, 503, 504].includes(upstream.status)
          ? upstream.status
          : 503,
        code,
      );
    }
    if (
      !upstream.headers.get('content-type')?.includes('application/x-ndjson') ||
      !upstream.body
    ) {
      clearTimeout(timer);
      controller.abort();
      void upstream.body?.cancel().catch(() => {});
      return failure(503);
    }
    const reader = upstream.body.getReader();
    let received = 0;
    const cleanup = () => clearTimeout(timer);
    const stream = new ReadableStream<Uint8Array>({
      async pull(sink) {
        try {
          const chunk = await reader.read();
          if (chunk.done) {
            cleanup();
            sink.close();
            return;
          }
          received += chunk.value.byteLength;
          if (received > 512000) throw new Error('Stream limit');
          sink.enqueue(chunk.value);
        } catch (error) {
          cleanup();
          controller.abort();
          void reader.cancel().catch(() => {});
          sink.error(error);
        }
      },
      async cancel() {
        cleanup();
        controller.abort();
        await reader.cancel().catch(() => {});
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    clearTimeout(timer);
    controller.abort();
    return failure(typeof error === 'number' ? error : 503);
  }
}
