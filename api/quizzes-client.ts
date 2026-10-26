import { ApiError, jsonRequest } from './json-client.ts';
import {
  isQuiz,
  isQuizAttempt,
  quizAnswers,
  type QuizAnswer,
  type QuizAttempt,
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

export async function submitQuizAttempt(
  quiz: Quiz,
  answers: QuizAnswer[],
  signal?: AbortSignal,
): Promise<QuizAttempt> {
  if (
    new Set(answers.map((answer) => answer.questionId)).size !== answers.length
  )
    throw new Error('Answer every question exactly once.');
  const validated = quizAnswers(
    quiz,
    Object.fromEntries(
      answers.map((answer) => [answer.questionId, answer.answer]),
    ),
  );
  const value = await jsonRequest(
    quizPath(quiz.id, 'attempts'),
    { answers: validated },
    'POST',
    { signal },
  );
  signal?.throwIfAborted();
  return isQuizAttempt(value, quiz) &&
    value.results.every((result) =>
      validated.some(
        (answer) =>
          answer.questionId === result.questionId &&
          answer.answer === result.answer,
      ),
    )
    ? value
    : invalid();
}

export async function listQuizAttempts(
  quiz: Quiz,
  signal?: AbortSignal,
): Promise<QuizAttempt[]> {
  const value = await jsonRequest(
    quizPath(quiz.id, 'attempts'),
    undefined,
    'POST',
    { signal },
  );
  signal?.throwIfAborted();
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    !value.items.every((item) => isQuizAttempt(item, quiz)) ||
    new Set(value.items.map((item) => item.id)).size !== value.items.length
  )
    return invalid();
  return value.items;
}
export async function retryQuiz(
  quiz: Quiz,
  attempt: QuizAttempt,
  signal?: AbortSignal,
): Promise<Quiz> {
  if (!isQuizAttempt(attempt, quiz)) return invalid();
  const mistakes = new Set(
    attempt.results
      .filter((result) => !result.correct)
      .map((result) => result.questionId),
  );
  if (!mistakes.size)
    throw new ApiError(
      409,
      'no_incorrect_answers',
      'Every answer was correct. There are no mistakes to retry.',
    );
  const value = await jsonRequest(
    quizPath(quiz.id, 'retry'),
    { attemptId: attempt.id },
    'POST',
    { signal },
  );
  signal?.throwIfAborted();
  if (
    !isQuiz(value) ||
    value.id === quiz.id ||
    value.documentId !== quiz.documentId ||
    value.sourceRevision !== quiz.sourceRevision ||
    value.language !== quiz.language ||
    value.provider !== quiz.provider ||
    value.questions.length !== mistakes.size ||
    !value.questions.every((question) => {
      const original = quiz.questions.find((item) => item.id === question.id);
      return (
        mistakes.has(question.id) &&
        !!original &&
        question.prompt === original.prompt &&
        question.type === original.type &&
        question.options.every(
          (option, index) => option === original.options[index],
        )
      );
    })
  )
    return invalid();
  return value;
}
