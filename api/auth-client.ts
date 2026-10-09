export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
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
      signal: AbortSignal.timeout(10000),
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
          : 'Unable to complete your request. Please try again.';
      throw new AuthError(response.status, code, message);
    }
    return value;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      503,
      'unavailable',
      'Archy is temporarily unavailable. Please try again.',
    );
  }
}
