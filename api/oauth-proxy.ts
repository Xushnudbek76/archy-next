import {
  authConfiguration,
  forwardJsonRequest,
  type AuthConfiguration,
} from './json-proxy.ts';

const providers = new Set(['google', 'kakao', 'apple']);
export function forwardOAuthRequest(
  request: Request,
  parts: string[],
  supplied?: AuthConfiguration,
) {
  const route =
    parts.length === 1 && parts[0] === 'providers'
      ? { path: '/v1/oauth/providers', method: 'GET' }
      : parts.length === 2 && providers.has(parts[0]!) && parts[1] === 'start'
        ? {
            path: `/v1/oauth/${parts[0]}/start`,
            method: 'POST',
            errorMessages: {
              provider_disabled: 'This sign-in provider is not configured.',
            },
          }
        : undefined;
  return forwardJsonRequest(request, route, supplied);
}

async function callbackFields(request: Request) {
  if (request.method === 'GET') return new URL(request.url).searchParams;
  if (
    request.headers.get('content-type')?.split(';')[0] !==
    'application/x-www-form-urlencoded'
  )
    throw new Error('Invalid callback');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        throw new Error('Callback too large');
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export async function oauthCallback(
  request: Request,
  provider: string,
  supplied?: AuthConfiguration,
) {
  const config = supplied ?? authConfiguration();
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  let destination = '/auth-error';
  if (providers.has(provider)) {
    try {
      const fields = await callbackFields(request);
      const code = fields.get('code');
      const state = fields.get('state');
      if (
        !code ||
        code.length > 4096 ||
        !state ||
        state.length > 128 ||
        fields.has('error')
      )
        throw new Error('Sign-in cancelled');
      const response = await forwardJsonRequest(
        new Request(`${config.appOrigin}/api/oauth/${provider}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: config.appOrigin,
            Cookie: request.headers.get('cookie') ?? '',
          },
          body: JSON.stringify({ code, state }),
        }),
        {
          path: `/v1/oauth/${provider}/finish`,
          method: 'POST',
          timeoutMs: 30000,
          errorMessages: {
            account_link_required:
              'Use your existing sign-in method for this email.',
          },
        },
        config,
      );
      const value: unknown = await response.json();
      if (
        response.ok &&
        value &&
        typeof value === 'object' &&
        'returnTo' in value &&
        typeof value.returnTo === 'string' &&
        /^\/(dashboard|documents|record|recordings|courses|timetable|settings(?:\/billing)?|pricing)$/.test(
          value.returnTo,
        )
      ) {
        destination = value.returnTo;
        for (const cookie of response.headers.getSetCookie())
          headers.append('Set-Cookie', cookie);
      } else if (
        value &&
        typeof value === 'object' &&
        'code' in value &&
        value.code === 'account_link_required'
      )
        destination += '?reason=existing-account';
    } catch {
      /* A new sign-in attempt is required after an invalid callback. */
    }
  }
  headers.set('Location', `${config.appOrigin}${destination}`);
  return new Response(null, { status: 303, headers });
}
