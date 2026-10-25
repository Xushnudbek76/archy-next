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
