import { ApiError, jsonRequest } from './json-client.ts';
import {
  isDocumentDetail,
  type DocumentDetail,
} from '../libs/types/documents.ts';
export function pdfError(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      pdf_too_large: 'Choose a PDF no larger than 20 MB.',
      pdf_type: 'Choose a PDF file.',
      pdf_encrypted:
        'This PDF is password protected. Upload an unencrypted copy.',
      pdf_no_text:
        'This PDF has no readable text. Scanned pages need OCR first.',
      pdf_too_many_pages: 'Choose a PDF with at most 200 pages.',
      pdf_text_too_large:
        'This PDF contains too much text. Split it into smaller files.',
      invalid_pdf:
        'This PDF could not be read. Export it again and try another file.',
    };
    const message = messages[error.code];
    if (message) return message;
    if (error.status === 413) return 'Choose a PDF smaller than 20 MB.';
    if (error.status === 409)
      return 'This document already has a PDF. Refresh it to see the saved file.';
    if (error.status === 403)
      return 'Your session expired. Please sign in again.';
    if (error.status === 429)
      return 'PDF uploads are busy. Wait a moment and try again.';
  }
  return 'The upload may have completed. Refresh this document before trying again.';
}
export async function uploadPdf(
  id: string,
  file: File,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<DocumentDetail> {
  if (!/\.pdf$/i.test(file.name) || !file.size)
    throw new ApiError(400, 'pdf_type', 'Choose a PDF file.');
  if (file.size > 20 * 1024 * 1024)
    throw new ApiError(
      413,
      'pdf_too_large',
      'Choose a PDF no larger than 20 MB.',
    );
  const csrf = await jsonRequest('/api/auth/csrf', undefined, undefined, {
    signal,
  });
  if (
    !csrf ||
    typeof csrf !== 'object' ||
    !('csrfToken' in csrf) ||
    typeof csrf.csrfToken !== 'string'
  )
    throw new ApiError(503, 'unavailable', 'Please try again.');
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    request.open('POST', `/api/documents/${id}/pdf`);
    request.timeout = 120000;
    request.responseType = 'json';
    request.setRequestHeader('Content-Type', 'application/pdf');
    request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    request.setRequestHeader('X-CSRFToken', csrf.csrfToken as string);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      cleanup();
      const value: unknown = request.response;
      if (
        request.status >= 200 &&
        request.status < 300 &&
        isDocumentDetail(value)
      )
        resolve(value);
      else
        reject(
          new ApiError(
            request.status,
            value &&
              typeof value === 'object' &&
              'code' in value &&
              typeof value.code === 'string'
              ? value.code
              : 'invalid_response',
            'Unable to upload PDF.',
          ),
        );
    };
    request.onerror = request.ontimeout = () => {
      cleanup();
      reject(
        new ApiError(504, 'timeout', 'Refresh this document before retrying.'),
      );
    };
    request.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    request.send(file);
  });
}
