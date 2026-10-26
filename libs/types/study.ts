import { documentId } from './documents.ts';

export type StudySource = {
  id: string;
  kind: 'pdf' | 'transcript';
  text: string;
  page: number | null;
  start: number | null;
  end: number | null;
};
export type StudyNotes =
  | { available: false }
  | {
      available: true;
      language: 'en' | 'ko';
      provider: string;
      overview: string;
      sections: { title: string; text: string; sourceIds: string[] }[];
    };
export type StudyLanguage = 'en' | 'ko';
export const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export const boundedText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && (v.length <= max || Array.from(v).length <= max);
export function isStudySource(v: unknown): v is StudySource {
  return (
    object(v) &&
    boundedText(v.id, 160) &&
    v.id.length > 0 &&
    ['pdf', 'transcript'].includes(String(v.kind)) &&
    boundedText(v.text, 500000) &&
    (v.page === null ||
      (Number.isInteger(v.page) &&
        Number(v.page) >= 1 &&
        Number(v.page) <= 200)) &&
    (v.start === null ||
      (typeof v.start === 'number' &&
        Number.isFinite(v.start) &&
        v.start >= 0)) &&
    (v.end === null ||
      (typeof v.end === 'number' &&
        Number.isFinite(v.end) &&
        v.end > Number(v.start)))
  );
}
export function isStudyNotes(v: unknown): v is StudyNotes {
  return (
    object(v) &&
    (v.available === false ||
      (v.available === true &&
        ['en', 'ko'].includes(String(v.language)) &&
        boundedText(v.provider, 32) &&
        boundedText(v.overview, 12000) &&
        Array.isArray(v.sections) &&
        v.sections.length <= 100 &&
        v.sections.every(
          (s) =>
            object(s) &&
            boundedText(s.title, 500) &&
            boundedText(s.text, 16000) &&
            Array.isArray(s.sourceIds) &&
            s.sourceIds.length <= 200 &&
            s.sourceIds.every((id) => boundedText(id, 160)),
        )))
  );
}
export function studyPath(
  id: string,
  feature: 'sources' | 'study-notes' | 'quizzes' | 'conversations',
) {
  if (!documentId(id)) throw new Error('Invalid document');
  return `/api/study/documents/${id}/${feature}`;
}
export function sourceLabel(source: StudySource) {
  if (source.kind === 'pdf')
    return source.page ? `PDF page ${source.page}` : 'PDF material';
  return source.start === null
    ? 'Transcript'
    : `Lecture ${formatTime(source.start)}`;
}
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
