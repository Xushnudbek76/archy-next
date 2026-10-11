export type Recording = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  sizeBytes: number;
  durationSeconds: number | null;
  contentType: string;
  createdAt: string;
};
export type Upload = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  uploadedBytes: number;
  sha256: string;
  status: 'UPLOADING' | 'ACCEPTED' | 'FAILED' | 'CANCELLED';
  errorCode: string;
  chunkBytes: number;
  recording: Recording | null;
  createdAt: string;
};
export type Page<T> = { items: T[]; total: number; nextPage: number | null };
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isRecording(value: unknown): value is Recording {
  if (!value || typeof value !== 'object') return false;
  const r = value as Recording;
  return (
    uuid(r.id) &&
    uuid(r.courseId) &&
    typeof r.title === 'string' &&
    typeof r.courseTitle === 'string' &&
    integer(r.sizeBytes) &&
    r.sizeBytes > 0 &&
    (r.durationSeconds === null ||
      (typeof r.durationSeconds === 'number' &&
        Number.isFinite(r.durationSeconds) &&
        r.durationSeconds > 0)) &&
    typeof r.contentType === 'string' &&
    date(r.createdAt)
  );
}
export function isUpload(value: unknown): value is Upload {
  if (!value || typeof value !== 'object') return false;
  const u = value as Upload;
  return (
    uuid(u.id) &&
    uuid(u.courseId) &&
    typeof u.title === 'string' &&
    typeof u.courseTitle === 'string' &&
    typeof u.fileName === 'string' &&
    integer(u.sizeBytes) &&
    u.sizeBytes > 0 &&
    integer(u.uploadedBytes) &&
    u.uploadedBytes <= u.sizeBytes &&
    integer(u.chunkBytes) &&
    u.chunkBytes > 0 &&
    u.chunkBytes <= 4 * 1024 * 1024 &&
    typeof u.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(u.sha256) &&
    ['UPLOADING', 'ACCEPTED', 'FAILED', 'CANCELLED'].includes(u.status) &&
    typeof u.errorCode === 'string' &&
    date(u.createdAt) &&
    (u.recording === null || isRecording(u.recording))
  );
}
export function isPage<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is Page<T> {
  if (!value || typeof value !== 'object') return false;
  const p = value as Page<T>;
  return (
    Array.isArray(p.items) &&
    p.items.length <= 20 &&
    p.items.every(guard) &&
    integer(p.total) &&
    p.total >= p.items.length &&
    (p.nextPage === null || (integer(p.nextPage) && p.nextPage > 1))
  );
}
