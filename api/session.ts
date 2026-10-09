import 'server-only';
import { cookies } from 'next/headers';
import { AUTH_READ_TIMEOUT_MS } from './auth-timeouts.ts';
import { authConfiguration, sessionCookies } from './auth-proxy.ts';
import { isUser, type User } from '../libs/types/auth.ts';

export class SessionUnavailable extends Error {}

export async function getCurrentUser(): Promise<User | null> {
  const cookie = sessionCookies((await cookies()).toString());
  if (!cookie.includes('sessionid=')) return null;
  try {
    const response = await fetch(
      `${authConfiguration().apiBaseUrl}/v1/users/me`,
      {
        headers: { Cookie: cookie },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(AUTH_READ_TIMEOUT_MS),
      },
    );
    if (response.status === 403 || response.status === 401) return null;
    const value: unknown = await response.json();
    if (!response.ok || !isUser(value)) throw new SessionUnavailable();
    return value;
  } catch {
    throw new SessionUnavailable('Unable to check your account');
  }
}
