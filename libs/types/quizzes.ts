import { documentId } from './documents.ts';
import { boundedText, object, type StudyLanguage } from './study.ts';

export type QuizQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false';
  prompt: string;
  options: string[];
};
export type Quiz = {
  id: string;
  documentId: string;
  title: string;
  language: StudyLanguage;
  provider: 'fixture' | 'groq';
  sourceRevision: string;
  createdAt: string;
  questions: QuizQuestion[];
};
export type QuizSettings = {
  questionType: 'multiple_choice' | 'true_false' | 'mixed';
  questionCount: 5 | 10 | 15;
  language: StudyLanguage;
};
const text = (value: unknown, max: number): value is string =>
  boundedText(value, max) && value.trim().length > 0;
const unique = (values: string[]) => new Set(values).size === values.length;
function isQuestion(value: unknown): value is QuizQuestion {
  return (
    object(value) &&
    Object.keys(value).every((key) =>
      ['id', 'type', 'prompt', 'options'].includes(key),
    ) &&
    documentId(value.id) &&
    ['multiple_choice', 'true_false'].includes(String(value.type)) &&
    text(value.prompt, 800) &&
    Array.isArray(value.options) &&
    value.options.length === (value.type === 'true_false' ? 2 : 4) &&
    value.options.every((option) => text(option, 600)) &&
    unique(value.options)
  );
}
export function isQuiz(value: unknown): value is Quiz {
  return (
    object(value) &&
    documentId(value.id) &&
    documentId(value.documentId) &&
    text(value.title, 100) &&
    ['en', 'ko'].includes(String(value.language)) &&
    ['fixture', 'groq'].includes(String(value.provider)) &&
    typeof value.sourceRevision === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sourceRevision) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    Array.isArray(value.questions) &&
    value.questions.length > 0 &&
    value.questions.length <= 15 &&
    value.questions.every(isQuestion) &&
    unique(value.questions.map((q) => q.id))
  );
}
export function quizPath(id: string, feature?: 'attempts' | 'retry') {
  if (!documentId(id)) throw new Error('Invalid quiz');
  return `/api/study/quizzes/${id}${feature ? `/${feature}` : ''}`;
}

export type QuizAnswer = { questionId: string; answer: number };
export type QuizAttempt = {
  id: string;
  quizId: string;
  score: number;
  total: number;
  createdAt: string;
  results: {
    questionId: string;
    answer: number;
    correctAnswer: number;
    correct: boolean;
    explanation: string;
    sourceIds: string[];
  }[];
};
const optionIndex = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value < 4;
export function isQuizAttempt(
  value: unknown,
  quiz?: Quiz,
): value is QuizAttempt {
  if (
    !object(value) ||
    !documentId(value.id) ||
    !documentId(value.quizId) ||
    !Number.isSafeInteger(value.score) ||
    !Number.isSafeInteger(value.total) ||
    Number(value.total) < 1 ||
    Number(value.total) > 15 ||
    Number(value.score) < 0 ||
    Number(value.score) > Number(value.total) ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !Array.isArray(value.results) ||
    value.results.length !== value.total
  )
    return false;
  const results = value.results;
  if (
    !results.every(
      (result) =>
        object(result) &&
        documentId(result.questionId) &&
        optionIndex(result.answer) &&
        optionIndex(result.correctAnswer) &&
        typeof result.correct === 'boolean' &&
        result.correct === (result.answer === result.correctAnswer) &&
        text(result.explanation, 1500) &&
        Array.isArray(result.sourceIds) &&
        result.sourceIds.length >= 1 &&
        result.sourceIds.length <= 20 &&
        result.sourceIds.every((id) => text(id, 160)) &&
        unique(result.sourceIds),
    )
  )
    return false;
  if (
    !unique(results.map((result) => result.questionId)) ||
    results.filter((result) => result.correct).length !== value.score
  )
    return false;
  return (
    !quiz ||
    (value.quizId === quiz.id &&
      value.total === quiz.questions.length &&
      results.every((result) => {
        const question = quiz.questions.find((q) => q.id === result.questionId);
        return (
          !!question &&
          result.answer < question.options.length &&
          result.correctAnswer < question.options.length
        );
      }))
  );
}
export function quizAnswers(
  quiz: Quiz,
  answers: Record<string, number>,
): QuizAnswer[] {
  if (
    Object.keys(answers).length !== quiz.questions.length ||
    Object.keys(answers).some(
      (id) => !quiz.questions.some((question) => question.id === id),
    )
  )
    throw new Error('Answer every question before submitting.');
  return quiz.questions.map((question) => {
    const answer = answers[question.id];
    if (!optionIndex(answer) || answer >= question.options.length)
      throw new Error('Choose a valid option for every question.');
    return { questionId: question.id, answer };
  });
}
