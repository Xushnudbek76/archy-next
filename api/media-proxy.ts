import 'server-only';
import {
  authConfiguration,
  sessionCookies,
  type AuthConfiguration,
} from './json-proxy.ts';

const headers = () =>
  new Headers({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
function failure(status: number, retryAfter?: string) {
  const responseHeaders = headers();
  if (retryAfter && /^\d{1,6}$/.test(retryAfter))
    responseHeaders.set('Retry-After', retryAfter);
  return Response.json(
    {
      code:
        status === 429
          ? 'rate_limited'
          : status === 409
            ? 'upload_conflict'
            : status === 413
              ? 'invalid_chunk'
              : 'unavailable',
      message: 'The recording request could not be completed.',
    },
    { status, headers: responseHeaders },
  );
}
async function boundedBody(request: Request) {
  const declared = request.headers.get('Content-Length');
  if (declared !== null) {
    if (!/^\d{1,16}$/.test(declared)) throw 400;
    if (Number(declared) > 4194304) throw 413;
  }
  request.signal.throwIfAborted();
  const reader = request.body?.getReader();
  if (!reader) throw 400;
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expire = () => {
    expired = true;
    void reader.cancel();
  };
  const abort = () => void reader.cancel();
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(expire, 15000);
  };
  request.signal.addEventListener('abort', abort, { once: true });
  reset();
  try {
    while (true) {
      const { done, value } = await reader.read();
      request.signal.throwIfAborted();
      if (done) break;
      if (value.byteLength) reset();
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw 413;
      }
      chunks.push(value);
    }
    if (expired) throw 408;
    if (!size) throw 400;
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
export async function forwardChunk(
  request: Request,
  id: string,
  supplied?: AuthConfiguration,
) {
  if (request.method !== 'PATCH') return failure(405);
  try {
    const config = supplied ?? authConfiguration();
    if (request.headers.get('Origin') !== config.appOrigin) return failure(403);
    const offset = request.headers.get('Upload-Offset') ?? '';
    if (!/^\d{1,16}$/.test(offset) || !Number.isSafeInteger(Number(offset)))
      return failure(400);
    if (request.headers.get('Content-Type') !== 'application/octet-stream')
      return failure(415);
    const cookie = sessionCookies(request.headers.get('Cookie'));
    if (!/(?:^|; )sessionid=.+/.test(cookie)) return failure(403);
    const body = await boundedBody(request);
    const upstream = await fetch(
      `${config.apiBaseUrl}/v1/uploads/${id}/chunks`,
      {
        method: 'PATCH',
        body,
        cache: 'no-store',
        redirect: 'manual',
        headers: {
          Cookie: cookie,
          Origin: config.appOrigin,
          'Content-Type': 'application/octet-stream',
          'Upload-Offset': offset,
          'X-CSRFToken': request.headers.get('X-CSRFToken') ?? '',
        },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      },
    );
    if (!upstream.ok)
      return failure(
        [400, 403, 404, 408, 409, 413, 415, 429].includes(upstream.status)
          ? upstream.status
          : 503,
        upstream.status === 429
          ? (upstream.headers.get('Retry-After') ?? undefined)
          : undefined,
      );
    return Response.json(await upstream.json(), {
      status: 200,
      headers: headers(),
    });
  } catch (error) {
    return failure(typeof error === 'number' ? error : 503);
  }
}
export async function forwardAudio(
  request: Request,
  id: string,
  supplied?: AuthConfiguration,
) {
  if (!['GET', 'HEAD'].includes(request.method)) return failure(405);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const config = supplied ?? authConfiguration();
    const outgoing = new Headers({
      Cookie: sessionCookies(request.headers.get('Cookie')),
    });
    const range = request.headers.get('Range');
    if (range && range.length <= 100 && request.method === 'GET') {
      outgoing.set('Range', range);
    }
    const upstream = await fetch(
      `${config.apiBaseUrl}/v1/recordings/${id}/audio`,
      {
        method: request.method,
        headers: outgoing,
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.any([request.signal, controller.signal]),
      },
    );
    clearTimeout(timer);
    const responseHeaders = headers();
    for (const key of [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
    ]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    if (upstream.status === 416) {
      await upstream.body?.cancel();
      responseHeaders.delete('Content-Length');
      return new Response(null, { status: 416, headers: responseHeaders });
    }
    if (![200, 206].includes(upstream.status)) {
      await upstream.body?.cancel();
      return failure(
        [403, 404].includes(upstream.status) ? upstream.status : 503,
      );
    }
    if (
      ![
        'audio/wav',
        'audio/mpeg',
        'audio/mp4',
        'audio/flac',
        'audio/ogg',
        'audio/webm',
      ].includes(upstream.headers.get('Content-Type') ?? '')
    ) {
      await upstream.body?.cancel();
      return failure(503);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure(503);
  } finally {
    clearTimeout(timer);
  }
}
