export type ProcessingStatus = {
  status:
    | 'unavailable'
    | 'queued'
    | 'transcribing'
    | 'summarizing'
    | 'completed'
    | 'failed';
  language: 'ko' | 'en' | null;
  transcriptAvailable: boolean;
  notesAvailable: boolean;
  errorCode: string;
  deferred: boolean;
  updatedAt: string | null;
};
export type Segment = { start: number; end: number; text: string };
export type LectureNote = {
  overview: string;
  key_concepts: string[];
  examples: string[];
  review_questions: string[];
  unclear_passages: string[];
};
export type Result<T> =
  | { available: false }
  | {
      available: true;
      language: 'ko' | 'en';
      provider: string;
      model: string;
      data: T;
    };
export type TranscriptResult = Result<{ text: string; segments: Segment[] }>;
export type NoteResult = Result<LectureNote>;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const language = (v: unknown) => v === 'ko' || v === 'en';
function text(v: unknown, max = 200000): v is string {
  if (typeof v !== 'string') return false;
  if (v.length <= max) return true;
  let count = 0;
  for (let index = 0; index < v.length; index++) {
    if (v.codePointAt(index)! > 0xffff) index++;
    if (++count > max) return false;
  }
  return true;
}
export function isProcessingStatus(v: unknown): v is ProcessingStatus {
  return (
    object(v) &&
    typeof v.status === 'string' &&
    typeof v.status === 'string' &&
    [
      'unavailable',
      'queued',
      'transcribing',
      'summarizing',
      'completed',
      'failed',
    ].includes(String(v.status)) &&
    (v.language === null || language(v.language)) &&
    typeof v.transcriptAvailable === 'boolean' &&
    typeof v.notesAvailable === 'boolean' &&
    text(v.errorCode, 40) &&
    typeof v.deferred === 'boolean' &&
    (v.updatedAt === null ||
      (text(v.updatedAt) && Number.isFinite(Date.parse(v.updatedAt))))
  );
}
export function shouldPoll(v: ProcessingStatus) {
  return !['unavailable', 'completed', 'failed'].includes(v.status);
}
function validResult(v: unknown): v is Record<string, unknown> {
  return (
    object(v) &&
    v.available === true &&
    language(v.language) &&
    text(v.provider, 16) &&
    text(v.model, 80) &&
    object(v.data)
  );
}
export function isTranscriptResult(v: unknown): v is TranscriptResult {
  if (object(v) && v.available === false) return true;
  if (!validResult(v) || !object(v.data)) return false;
  return (
    text(v.data.text) &&
    Array.isArray(v.data.segments) &&
    v.data.segments.length <= 10000 &&
    v.data.segments.every(
      (s: unknown) =>
        object(s) &&
        typeof s.start === 'number' &&
        Number.isFinite(s.start) &&
        s.start >= 0 &&
        typeof s.end === 'number' &&
        Number.isFinite(s.end) &&
        s.end > s.start &&
        text(s.text, 16000),
    )
  );
}
export function isNoteResult(v: unknown): v is NoteResult {
  if (object(v) && v.available === false) return true;
  if (!validResult(v) || !object(v.data) || !text(v.data.overview, 1200))
    return false;
  const data = v.data;
  return [
    'key_concepts',
    'examples',
    'review_questions',
    'unclear_passages',
  ].every(
    (key) =>
      Array.isArray(data[key]) &&
      data[key].length <= 12 &&
      data[key].every((t: unknown) => text(t, 1200)),
  );
}
