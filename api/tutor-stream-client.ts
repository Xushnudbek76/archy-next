import { ApiError, jsonRequest } from './json-client.ts';
import { documentId } from '../libs/types/documents.ts';
import {
  object,
  isStudySource,
  type StudySource,
  type StudyLanguage,
} from '../libs/types/study.ts';
export type TutorEvent =
  | { type: 'delta'; text: string }
  | { type: 'sources'; items: StudySource[] }
  | { type: 'done'; messageId: string };
export function tutorError(code: string) {
  const messages: Record<string, string> = {
    quota_wait: 'The AI quota limit was reached. Please try later.',
    tutor_unavailable: 'The tutor AI is not configured yet.',
    tutor_busy: 'Another answer is still being prepared. Try again shortly.',
    sources_changed: 'The document changed. Start a new question.',
    request_conflict: 'This request was already used for another question.',
    tutor_timeout: 'The tutor timed out. Retry the question.',
    tutor_provider_unavailable: 'The tutor provider is unavailable. Try later.',
  };
  return (
    messages[code] ?? 'The tutor response was interrupted. Retry the question.'
  );
}
export async function readTutorStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: TutorEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pending = '',
    size = 0,
    output = 0,
    count = 0,
    completed = false;
  function line(raw: string) {
    if (!raw.trim()) return;
    if (completed || ++count > 10000 || raw.length > 65536)
      throw new Error('Invalid tutor response limit.');
    const value: unknown = JSON.parse(raw);
    if (!object(value)) throw new Error('Invalid tutor response.');
    if (value.type === 'error')
      throw new ApiError(
        503,
        String(value.code),
        tutorError(String(value.code)),
      );
    if (value.type === 'delta' && typeof value.text === 'string') {
      output += value.text.length;
      if (output > 20000) throw new Error('Tutor answer limit exceeded.');
      onEvent({ type: 'delta', text: value.text });
      return;
    }
    if (
      value.type === 'sources' &&
      Array.isArray(value.items) &&
      value.items.length <= 6 &&
      value.items.every(isStudySource)
    ) {
      onEvent({ type: 'sources', items: value.items });
      return;
    }
    if (value.type === 'done' && documentId(value.messageId)) {
      completed = true;
      onEvent({ type: 'done', messageId: value.messageId });
      return;
    }
    throw new Error('Invalid tutor response.');
  }
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 512000) throw new Error('Tutor response limit exceeded.');
      pending += decoder.decode(chunk.value, { stream: true });
      let split: number;
      while ((split = pending.indexOf('\n')) >= 0) {
        line(pending.slice(0, split));
        pending = pending.slice(split + 1);
      }
      if (pending.length > 65536)
        throw new Error('Tutor response limit exceeded.');
    }
    pending += decoder.decode();
    if (pending.trim()) line(pending);
    if (!completed)
      throw new Error('The tutor response is incomplete. Retry the question.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function sendTutorMessage(
  id: string,
  message: string,
  language: StudyLanguage,
  requestId: string,
  signal: AbortSignal,
  onEvent: (event: TutorEvent) => void,
) {
  if (
    !documentId(id) ||
    !documentId(requestId) ||
    !message.trim() ||
    Array.from(message.trim()).length > 2000
  )
    throw new ApiError(
      400,
      'invalid_request',
      'Write a question of at most 2,000 characters.',
    );
  const csrf = await jsonRequest('/api/auth/csrf', undefined, 'POST', {
    signal,
  });
  if (!object(csrf) || typeof csrf.csrfToken !== 'string')
    throw new ApiError(503, 'unavailable', 'Sign in again to use the tutor.');
  const response = await fetch(`/api/tutor/conversations/${id}/messages`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf.csrfToken,
    },
    body: JSON.stringify({ message: message.trim(), language, requestId }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
  });
  if (!response.ok) {
    const value: unknown = await response.json().catch(() => null);
    const code =
      object(value) && typeof value.code === 'string'
        ? value.code
        : 'unavailable';
    throw new ApiError(response.status, code, tutorError(code));
  }
  if (
    !response.headers.get('content-type')?.includes('application/x-ndjson') ||
    !response.body
  )
    throw new Error('Invalid tutor stream.');
  await readTutorStream(response.body, onEvent);
}
