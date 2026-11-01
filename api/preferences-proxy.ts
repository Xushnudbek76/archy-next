import 'server-only';
import { documentId } from '../libs/types/documents.ts';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
export function forwardPreferencesRequest(
  request: Request,
  parts: string[],
  config?: AuthConfiguration,
) {
  let method: string | undefined;
  if (!parts.length) method = request.method === 'PATCH' ? 'PATCH' : 'GET';
  else if (parts.length === 1 && parts[0] === 'formats')
    method = request.method === 'POST' ? 'POST' : 'GET';
  else if (parts.length === 2 && parts[0] === 'formats' && documentId(parts[1]))
    method = 'PATCH';
  else if (
    parts.length === 3 &&
    parts[0] === 'formats' &&
    documentId(parts[1]) &&
    parts[2] === 'remove'
  )
    method = 'POST';
  else if (parts.length === 1 && parts[0] === 'close') method = 'POST';
  return forwardJsonRequest(
    request,
    method && !new URL(request.url).search
      ? {
          path: `/v1/preferences${parts.length ? '/' + parts.join('/') : ''}`,
          method,
          errorMessages: {
            invalid_password: 'Check your current password.',
            format_limit: 'You can save up to 10 custom note formats.',
            active_subscription:
              'Cancel your subscription before closing your account.',
            payment_pending:
              'Resolve the pending payment in billing settings before closing your account.',
          },
        }
      : undefined,
    config,
  );
}
