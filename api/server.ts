import 'server-only';
import type { HealthResponse } from '@/libs/types/health';

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok'
  );
}

export async function isApiLive(): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? 'http://127.0.0.1:3007'}/v1/health/live`,
      { cache: 'no-store', signal: AbortSignal.timeout(1500) },
    );
    if (!response.ok) return false;
    const health: unknown = await response.json();
    return isHealthResponse(health);
  } catch {
    return false;
  }
}
