import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
import { documentId } from '../libs/types/documents.ts';

export function forwardDocumentRequest(
  request: Request,
  parts: string[],
  config?: AuthConfiguration,
) {
  const query = new URL(request.url).searchParams;
  if (
    [...query.keys()].some(
      (key) =>
        !['page', 'q', 'courseId'].includes(key) ||
        query.getAll(key).length !== 1,
    ) ||
    (query.has('page') && !/^[1-9]\d{0,8}$/.test(query.get('page')!)) ||
    (query.has('q') && Array.from(query.get('q')!).length > 100) ||
    (query.has('courseId') && !documentId(query.get('courseId'))) ||
    (query.size > 0 && (parts.length > 0 || request.method !== 'GET'))
  ) {
    return Promise.resolve(
      Response.json(
        { code: 'invalid_request', message: 'Check the request fields.' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    );
  }
  let route: { path: string; method: string } | undefined;
  if (!parts.length)
    route = {
      path: `/v1/documents${query.size ? '?' + query : ''}`,
      method: request.method === 'POST' ? 'POST' : 'GET',
    };
  else if (parts.length === 1 && documentId(parts[0]))
    route = {
      path: `/v1/documents/${parts[0]}`,
      method: request.method === 'PATCH' ? 'PATCH' : 'GET',
    };
  else if (
    parts.length === 2 &&
    documentId(parts[0]) &&
    ['archive', 'pin'].includes(parts[1]!)
  )
    route = { path: `/v1/documents/${parts.join('/')}`, method: 'POST' };
  return forwardJsonRequest(
    request,
    route
      ? {
          ...route,
          errorMessages: {
            term_archived: 'This semester is archived and read-only.',
          },
        }
      : undefined,
    config,
  );
}
