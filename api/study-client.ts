import { ApiError, jsonRequest } from './json-client.ts';
import {
  isStudySource,
  isStudyNotes,
  object,
  studyPath,
  type StudySource,
  type StudyNotes,
  type StudyLanguage,
} from '../libs/types/study.ts';
export async function readSources(
  id: string,
  signal?: AbortSignal,
): Promise<StudySource[]> {
  const value = await jsonRequest(studyPath(id, 'sources'), undefined, 'POST', {
    signal,
  });
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 11000 ||
    !value.items.every(isStudySource)
  )
    throw new ApiError(
      503,
      'invalid_response',
      'Study sources are unavailable.',
    );
  return value.items;
}
export async function studyNotes(
  id: string,
  language?: StudyLanguage,
  signal?: AbortSignal,
): Promise<StudyNotes> {
  const value = await jsonRequest(
    studyPath(id, 'study-notes'),
    language ? { language } : undefined,
    'POST',
    { signal, timeoutMs: 50000 },
  );
  if (!isStudyNotes(value))
    throw new ApiError(503, 'invalid_response', 'Study notes are unavailable.');
  return value;
}
export function studyError(cause: unknown) {
  if (!(cause instanceof ApiError))
    return 'Unable to load study tools. Please try again.';
  const messages: Record<string, string> = {
    study_source_limit:
      'This material is too large for one generation request. Use a shorter document.',
    source_changed: 'The material changed. Reload it before trying again.',
    ai_disabled:
      'AI is not configured yet. Your original material is still available.',
    provider_disabled:
      'AI is not configured yet. Your original material is still available.',
    no_sources:
      'Add readable material or wait for the transcript before using study tools.',
    quota_wait: 'The AI provider is busy. Try again later.',
  };
  return (
    messages[cause.code] ??
    (cause.status === 429
      ? 'The AI limit has been reached. Please try again later.'
      : cause.status === 401
        ? 'Sign in again to use study tools.'
        : cause.message)
  );
}
