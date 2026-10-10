import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  AUTH_READ_TIMEOUT_MS,
  AUTH_WRITE_TIMEOUT_MS,
} from './auth-timeouts.ts';

export type AuthConfiguration = { apiBaseUrl: string; appOrigin: string };
const errors: Record<number, [string, string]> = {
  400: ['invalid_request', 'Check your details and try again.'],
  403: ['forbidden', 'The request could not be accepted.'],
  404: ['not_found', 'This request is not available.'],
  405: ['method_not_allowed', 'This request is not available.'],
  413: ['invalid_request', 'The request is too large.'],
  415: ['invalid_request', 'Send a JSON request.'],
  429: ['rate_limited', 'Too many attempts. Please try again later.'],
  503: ['unavailable', 'Archy is temporarily unavailable. Please try again.'],
  504: [
    'timeout',
    'Archy took too long to respond. The request may already have completed.',
  ],
};

export function authConfiguration(): AuthConfiguration {
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3007';
  const appOrigin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  for (const value of [apiBaseUrl, appOrigin]) {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !['', '/'].includes(url.pathname)
    )
      throw new Error('Invalid application origin');
    if (
      process.env.NODE_ENV === 'production' &&
      url.protocol !== 'https:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
      throw new Error('HTTPS required');
  }
  return {
    apiBaseUrl: new URL(apiBaseUrl).origin,
    appOrigin: new URL(appOrigin).origin,
  };
}

function errorResponse(
  status: number,
  id: string,
  headers?: Headers,
): Response {
  const [code, message] = errors[status] ?? errors[503]!;
  return Response.json({ code, message, requestId: id }, { status, headers });
}

export function sessionCookies(raw: string | null): string {
  return (raw ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => /^(sessionid|csrftoken)=[^;\s]*$/.test(part))
    .join('; ');
}

function browserCookie(raw: string, secure: boolean): string | null {
  const [value, ...attributes] = raw.split(';').map((part) => part.trim());
  if (!value || !/^(sessionid|csrftoken)=/.test(value)) return null;
  const kept = attributes.filter(
    (attribute) => !/^(domain|path|samesite)=/i.test(attribute),
  );
  kept.push('Path=/', 'SameSite=Lax');
  if (
    value.startsWith('sessionid=') &&
    !kept.some((a) => /^httponly$/i.test(a))
  )
    kept.push('HttpOnly');
  if (secure && !kept.some((a) => /^secure$/i.test(a))) kept.push('Secure');
  return [value, ...kept].join('; ');
}

async function jsonBody(request: Request): Promise<string> {
  if (
    !request.headers
      .get('Content-Type')
      ?.toLowerCase()
      .split(';')[0]
      ?.trim()
      .match(/^application\/json$/)
  )
    throw 415;
  const reader = request.body?.getReader();
  if (!reader) throw 400;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw 413;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    JSON.parse(text);
  } catch {
    throw 400;
  }
  return text;
}

export async function forwardJsonRequest(
  request: Request,
  route: { path: string; method: string } | undefined,
  supplied?: AuthConfiguration,
): Promise<Response> {
  const id = randomUUID();
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Request-ID': id,
  });
  if (!route) return errorResponse(404, id, headers);
  if (request.method !== route.method) {
    headers.set('Allow', route.method);
    return errorResponse(405, id, headers);
  }
  try {
    const config = supplied ?? authConfiguration();
    const outgoing = new Headers({ Accept: 'application/json' });
    const cookie = sessionCookies(request.headers.get('Cookie'));
    if (cookie) outgoing.set('Cookie', cookie);
    let body: string | undefined;
    if (request.method !== 'GET') {
      if (request.headers.get('Origin') !== config.appOrigin)
        return errorResponse(403, id, headers);
      body = await jsonBody(request);
      outgoing.set('Content-Type', 'application/json');
      outgoing.set('Origin', config.appOrigin);
      const csrf = request.headers.get('X-CSRFToken');
      if (csrf) outgoing.set('X-CSRFToken', csrf);
    }
    const upstream = await fetch(`${config.apiBaseUrl}${route.path}`, {
      method: route.method,
      headers: outgoing,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(
        route.method === 'GET' ? AUTH_READ_TIMEOUT_MS : AUTH_WRITE_TIMEOUT_MS,
      ),
    });
    if (upstream.status >= 300 && upstream.status < 400)
      return errorResponse(503, id, headers);
    for (const raw of upstream.headers.getSetCookie()) {
      const cookie = browserCookie(raw, config.appOrigin.startsWith('https:'));
      if (cookie) headers.append('Set-Cookie', cookie);
    }
    if (upstream.status === 429) {
      const retry = upstream.headers.get('Retry-After');
      if (retry && /^\d{1,6}$/.test(retry)) headers.set('Retry-After', retry);
    }
    if (!upstream.ok)
      return errorResponse(
        errors[upstream.status] ? upstream.status : 503,
        id,
        headers,
      );
    const payload: unknown = await upstream.json();
    return Response.json(payload, { status: upstream.status, headers });
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.name === 'TimeoutError'
        ? 504
        : typeof error === 'number' && errors[error]
          ? error
          : 503,
      id,
      headers,
    );
  }
}
