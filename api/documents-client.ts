import { ApiError, jsonRequest } from './json-client.ts';
import {
  isDocument,
  isDocumentDetail,
  isDocumentPage,
} from '../libs/types/documents.ts';
export type DocumentQuery = { page: number; q?: string; courseId?: string };
function invalid(): never {
  throw new ApiError(
    503,
    'unavailable',
    'Unable to load your documents. Please try again.',
  );
}
export async function listDocuments(
  query: DocumentQuery,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(query.page) });
  if (query.q) params.set('q', query.q);
  if (query.courseId) params.set('courseId', query.courseId);
  const value = await jsonRequest(
    `/api/documents?${params}`,
    undefined,
    undefined,
    { signal },
  );
  return isDocumentPage(value) ? value : invalid();
}
export async function getDocument(id: string, signal?: AbortSignal) {
  const value = await jsonRequest(
    `/api/documents/${id}`,
    undefined,
    undefined,
    { signal },
  );
  return isDocumentDetail(value) ? value : invalid();
}
export async function createDocument(title: string) {
  const value = await jsonRequest('/api/documents', { title });
  return isDocument(value) ? value : invalid();
}
export function documentError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This document is no longer available.';
    if (error.status === 400)
      return 'Check your document details and try again.';
    if (error.status === 403)
      return 'Your session expired. Please sign in again.';
    if (error.code === 'timeout')
      return 'The request may have completed. Refresh your documents before trying again.';
  }
  return 'Unable to complete the document request. Please try again.';
}
