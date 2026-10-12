import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function forwardProcessingRequest(
  request: Request,
  parts: string[],
  config?: AuthConfiguration,
) {
  if (new URL(request.url).searchParams.size)
    return Promise.resolve(
      Response.json(
        { code: 'invalid_request', message: 'Check the request fields.' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    );
  const suffix = parts.length === 1 ? 'processing' : parts[1];
  const valid =
    (parts.length === 1 || parts.length === 2) &&
    uuid.test(parts[0] ?? '') &&
    ['processing', 'transcript', 'notes'].includes(suffix ?? '');
  return forwardJsonRequest(
    request,
    valid
      ? { path: `/v1/recordings/${parts[0]}/${suffix}`, method: 'GET' }
      : undefined,
    config,
  );
}
