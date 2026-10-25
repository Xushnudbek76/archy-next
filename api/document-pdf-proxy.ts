import 'server-only';
import {
  authConfiguration,
  sessionCookies,
  type AuthConfiguration,
} from './json-proxy.ts';
import { documentId } from '../libs/types/documents.ts';
const MAX_BYTES = 20 * 1024 * 1024;
let receiving = 0;
function privateHeaders() {
  return new Headers({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
}
function failure(status: number, code = 'pdf_request_failed') {
  return Response.json(
    { code, message: 'The PDF request could not be completed.' },
    { status, headers: privateHeaders() },
  );
}
async function readBody(request: Request) {
  const declared = request.headers.get('Content-Length');
  if (
    declared !== null &&
    (!/^\d{1,16}$/.test(declared) || Number(declared) > MAX_BYTES)
  )
    throw Number(declared) > MAX_BYTES ? 413 : 400;
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
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(expire, 15000);
  };
  const abort = () => void reader.cancel();
  request.signal.addEventListener('abort', abort, { once: true });
  reset();
  try {
    while (true) {
      request.signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length) reset();
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw 413;
      }
      chunks.push(value);
    }
    request.signal.throwIfAborted();
    if (expired) throw 408;
    if (!size) throw 400;
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
export async function forwardPdfRequest(
  request: Request,
  id: string,
  config?: AuthConfiguration,
) {
  if (new URL(request.url).searchParams.size) return failure(400);
  if (!documentId(id)) return failure(404);
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return failure(405);
  let slot = false;
  const connection = new AbortController();
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const settings = config ?? authConfiguration();
    const cookie = sessionCookies(request.headers.get('Cookie'));
    const outgoing = new Headers({ Cookie: cookie });
    let body: Buffer | undefined;
    if (request.method === 'POST') {
      if (request.headers.get('Origin') !== settings.appOrigin)
        return failure(403);
      if (!/(?:^|; )sessionid=.+/.test(cookie)) return failure(403);
      if (request.headers.get('Content-Type') !== 'application/pdf')
        return failure(415);
      const encoded = request.headers.get('X-File-Name') ?? '';
      if (encoded.length > 3072) return failure(400);
      let name;
      try {
        name = decodeURIComponent(encoded);
      } catch {
        return failure(400);
      }
      if (
        !name ||
        Array.from(name).length > 255 ||
        Array.from(name).some(
          (char) =>
            char.charCodeAt(0) < 32 ||
            char.charCodeAt(0) === 127 ||
            char === '/' ||
            char === '\\',
        ) ||
        !/\.pdf$/i.test(name)
      )
        return failure(400);
      if (receiving >= 2) return failure(429);
      receiving++;
      slot = true;
      body = await readBody(request);
      outgoing.set('Content-Type', 'application/pdf');
      outgoing.set('X-File-Name', encoded);
      outgoing.set('Origin', settings.appOrigin);
      outgoing.set('X-CSRFToken', request.headers.get('X-CSRFToken') ?? '');
    }
    deadline = setTimeout(
      () => connection.abort(),
      request.method === 'POST' ? 45000 : 10000,
    );
    const upstream = await fetch(
      `${settings.apiBaseUrl}/v1/documents/${id}/pdf`,
      {
        method: request.method,
        body: body ? new Uint8Array(body) : undefined,
        headers: outgoing,
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.any([request.signal, connection.signal]),
      },
    );
    if (request.method !== 'POST') clearTimeout(deadline);
    if (!upstream.ok) {
      const value: unknown = await upstream.json().catch(() => null);
      const allowed = [
        'invalid_pdf',
        'pdf_encrypted',
        'pdf_no_text',
        'pdf_too_many_pages',
        'pdf_text_too_large',
        'invalid_file_name',
      ];
      const code =
        value &&
        typeof value === 'object' &&
        'code' in value &&
        typeof value.code === 'string' &&
        allowed.includes(value.code)
          ? value.code
          : undefined;
      return failure(
        [400, 403, 404, 408, 409, 413, 415, 429].includes(upstream.status)
          ? upstream.status
          : 503,
        code,
      );
    }
    if (request.method === 'POST')
      return Response.json(await upstream.json(), {
        headers: privateHeaders(),
      });
    if (upstream.headers.get('Content-Type') !== 'application/pdf') {
      await upstream.body?.cancel();
      return failure(503);
    }
    const headers = privateHeaders();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Security-Policy', 'sandbox');
    headers.set('Referrer-Policy', 'no-referrer');
    for (const key of ['Content-Length', 'Content-Disposition']) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(typeof error === 'number' ? error : 503);
  } finally {
    clearTimeout(deadline);
    if (slot) receiving--;
  }
}
