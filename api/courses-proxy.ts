import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function forwardCourseRequest(
  request: Request,
  parts: string[],
  supplied?: AuthConfiguration,
): Promise<Response> {
  const query = new URL(request.url).searchParams;
  if (
    [...query.keys()].some(
      (key) =>
        !['page', 'archived'].includes(key) || query.getAll(key).length !== 1,
    ) ||
    (query.has('page') && !/^[1-9]\d{0,8}$/.test(query.get('page')!)) ||
    (query.has('archived') &&
      !['true', 'false'].includes(query.get('archived')!)) ||
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
  if (parts.length === 0) {
    route = {
      path: `/v1/courses${query.size ? `?${query}` : ''}`,
      method: request.method === 'POST' ? 'POST' : 'GET',
    };
  } else if (parts.length === 1 && uuid.test(parts[0]!)) {
    route = { path: `/v1/courses/${parts[0]}`, method: 'PATCH' };
  } else if (
    parts.length === 2 &&
    uuid.test(parts[0]!) &&
    parts[1] === 'archive'
  ) {
    route = { path: `/v1/courses/${parts[0]}/archive`, method: 'POST' };
  }
  return forwardJsonRequest(request, route, supplied);
}
