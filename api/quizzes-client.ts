import { ApiError, jsonRequest } from './json-client.ts';
import {
  isQuiz,
  quizPath,
  type Quiz,
  type QuizSettings,
} from '../libs/types/quizzes.ts';
import { object, studyPath } from '../libs/types/study.ts';
import { studyErrors } from './study-errors.ts';

function invalid(): never {
  throw new ApiError(
    503,
    'invalid_response',
    'Quiz data is unavailable. Please try again.',
  );
}
export async function listQuizzes(
  documentId: string,
  signal?: AbortSignal,
): Promise<Quiz[]> {
  const value = await jsonRequest(
    studyPath(documentId, 'quizzes'),
    undefined,
    'POST',
    { signal },
  );
  signal?.throwIfAborted();
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 50 ||
    !value.items.every(
      (item) => isQuiz(item) && item.documentId === documentId,
    ) ||
    new Set(value.items.map((item) => item.id)).size !== value.items.length
  )
    return invalid();
  return value.items;
}
export async function createQuiz(
  documentId: string,
  settings: QuizSettings,
  signal?: AbortSignal,
): Promise<Quiz> {
  const value = await jsonRequest(
    studyPath(documentId, 'quizzes'),
    settings,
    'POST',
    { signal, timeoutMs: 50000 },
  );
  signal?.throwIfAborted();
  return isQuiz(value) && value.documentId === documentId ? value : invalid();
}
export async function readQuiz(
  id: string,
  signal?: AbortSignal,
): Promise<Quiz> {
  const value = await jsonRequest(quizPath(id), undefined, 'POST', { signal });
  signal?.throwIfAborted();
  return isQuiz(value) && value.id === id ? value : invalid();
}
export function quizError(cause: unknown) {
  if (!(cause instanceof ApiError))
    return 'Unable to load the quiz. Please try again.';
  if (studyErrors[cause.code]) return studyErrors[cause.code]!;
  if (cause.status === 401 || cause.status === 403)
    return 'Sign in again to use quizzes.';
  if (cause.status === 404)
    return 'This quiz or document is no longer available.';
  if (cause.code === 'timeout')
    return 'The quiz request may have completed. Refresh saved quizzes before generating again.';
  if (cause.status === 429)
    return 'The quiz limit has been reached. Please try again later.';
  return cause.message;
}
