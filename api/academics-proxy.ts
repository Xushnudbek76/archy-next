import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
import { documentId } from '../libs/types/documents.ts';

export function academicRoute(parts: string[], method: string) {
  const errors = {
    term_archived: 'This semester is archived and read-only.',
    import_conflict: 'This import was already saved with different details.',
    invalid_timetable: 'Use a public Everytime share link.',
    import_unavailable: 'The timetable provider is temporarily unavailable.',
    academic_limit: 'The workspace limit has been reached.',
  };
  let allowed = false;
  if (!parts.length) allowed = method === 'GET';
  else if (parts.length === 1 && ['terms', 'timetables'].includes(parts[0]!))
    allowed = method === 'POST';
  else if (
    parts.length === 2 &&
    ['terms', 'timetables'].includes(parts[0]!) &&
    documentId(parts[1])
  )
    allowed = method === 'PATCH';
  else if (parts.length === 3 && documentId(parts[1]))
    allowed =
      method === 'POST' &&
      ((parts[0] === 'terms' && parts[2] === 'archive') ||
        (parts[0] === 'timetables' &&
          ['select', 'primary'].includes(parts[2]!)));
  else if (
    parts.length === 2 &&
    parts[0] === 'import' &&
    ['preview', 'confirm'].includes(parts[1]!)
  )
    allowed = method === 'POST';
  if (!allowed) return undefined;
  return {
    path: `/v1/academics${parts.length ? '/' + parts.join('/') : ''}`,
    method,
    errorMessages: errors,
    timeoutMs: parts[0] === 'import' ? 35000 : undefined,
    maxBodyBytes: parts.join('/') === 'import/confirm' ? 512 * 1024 : undefined,
  };
}
export function forwardAcademicRequest(
  request: Request,
  parts: string[],
  config?: AuthConfiguration,
) {
  return forwardJsonRequest(
    request,
    new URL(request.url).search
      ? undefined
      : academicRoute(parts, request.method),
    config,
  );
}
