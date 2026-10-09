import {
  AUTH_CLIENT_READ_TIMEOUT_MS,
  AUTH_CLIENT_WRITE_TIMEOUT_MS,
} from './auth-timeouts.ts';

function timeoutMessage(path: string): string {
  return ['/api/auth/signup', '/api/auth/password-reset'].includes(path)
    ? 'The request took too long and may already have completed. Check your email before trying again.'
    : 'Archy took too long to respond. Refresh the page to check your account before trying again.';
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function authRequest(
  path: string,
  payload?: unknown,
): Promise<unknown> {
  try {
    let csrf: string | undefined;
    if (payload !== undefined) {
      const value = await authRequest('/api/auth/csrf');
      if (
        !value ||
        typeof value !== 'object' ||
        !('csrfToken' in value) ||
        typeof value.csrfToken !== 'string'
      )
        throw new AuthError(503, 'unavailable', 'Please try again.');
      csrf = value.csrfToken;
    }
    const response = await fetch(path, {
      method: payload === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        payload === undefined
          ? undefined
          : { 'Content-Type': 'application/json', 'X-CSRFToken': csrf! },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(
        payload === undefined
          ? AUTH_CLIENT_READ_TIMEOUT_MS
          : AUTH_CLIENT_WRITE_TIMEOUT_MS,
      ),
    });
    const value: unknown = await response.json();
    if (!response.ok) {
      const code =
        value &&
        typeof value === 'object' &&
        'code' in value &&
        typeof value.code === 'string'
          ? value.code
          : 'unavailable';
      const message =
        response.status === 429
          ? 'Too many attempts. Please try again later.'
          : code === 'timeout'
            ? timeoutMessage(path)
            : 'Unable to complete your request. Please try again.';
      throw new AuthError(response.status, code, message);
    }
    return value;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError')
      throw new AuthError(504, 'timeout', timeoutMessage(path));
    throw new AuthError(
      503,
      'unavailable',
      'Archy is temporarily unavailable. Please try again.',
    );
  }
}
