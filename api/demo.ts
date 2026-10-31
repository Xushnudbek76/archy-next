import 'server-only';
import { authConfiguration } from './auth-proxy';

export async function demoAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${authConfiguration().apiBaseUrl}/v1/demo`, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const value: unknown = await response.json();
    return (
      !!value &&
      typeof value === 'object' &&
      'available' in value &&
      value.available === true
    );
  } catch {
    return false;
  }
}
