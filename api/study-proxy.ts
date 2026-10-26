import 'server-only';
import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
import { documentId } from '../libs/types/documents.ts';
import { studyErrors } from './study-errors.ts';
export function studyRoute(
  parts: string[],
  method: string,
):
  | {
      path: string;
      method: string;
      timeoutMs?: number;
      errorMessages?: Readonly<Record<string, string>>;
    }
  | undefined {
  if (parts.length === 3 && parts[0] === 'documents' && documentId(parts[1])) {
    if (parts[2] === 'sources' && method === 'GET')
      return { path: `/v1/documents/${parts[1]}/sources`, method };
    if (
      ['study-notes', 'quizzes'].includes(parts[2]!) &&
      ['GET', 'POST'].includes(method)
    )
      return {
        path: `/v1/documents/${parts[1]}/${parts[2]}`,
        method,
        timeoutMs: method === 'POST' ? 45000 : undefined,
        errorMessages: studyErrors,
      };
  }
  if (parts[0] === 'quizzes' && documentId(parts[1])) {
    if (parts.length === 2 && method === 'GET')
      return { path: `/v1/quizzes/${parts[1]}`, method };
    if (
      parts.length === 3 &&
      parts[2] === 'attempts' &&
      ['GET', 'POST'].includes(method)
    )
      return {
        path: `/v1/quizzes/${parts[1]}/attempts`,
        method,
        errorMessages: studyErrors,
      };
    if (parts.length === 3 && parts[2] === 'retry' && method === 'POST')
      return {
        path: `/v1/quizzes/${parts[1]}/retry`,
        method,
        errorMessages: studyErrors,
      };
  }
}
export function forwardStudyRequest(
  request: Request,
  parts: string[],
  config?: AuthConfiguration,
) {
  return forwardJsonRequest(
    request,
    new URL(request.url).search ? undefined : studyRoute(parts, request.method),
    config,
  );
}
