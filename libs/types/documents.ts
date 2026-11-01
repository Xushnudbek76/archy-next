export type Document = {
  id: string;
  title: string;
  isPinned?: boolean;
  courseId: string | null;
  recordingId: string | null;
  hasPdf: boolean;
  fileName: string | null;
  pdfSizeBytes: number | null;
  pageCount: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type DocumentDetail = Document & { text: string | null };
export type DocumentPage = {
  items: Document[];
  total: number;
  page: number;
  pageSize: number;
  nextPage: number | null;
  previousPage: number | null;
};
export const documentId = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const date = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v));
export function isDocument(value: unknown): value is Document {
  if (!value || typeof value !== 'object') return false;
  const d = value as Document;
  return (
    documentId(d.id) &&
    typeof d.title === 'string' &&
    (d.isPinned === undefined || typeof d.isPinned === 'boolean') &&
    d.title.trim().length > 0 &&
    Array.from(d.title).length <= 100 &&
    (d.courseId === null || documentId(d.courseId)) &&
    (d.recordingId === null || documentId(d.recordingId)) &&
    typeof d.hasPdf === 'boolean' &&
    (d.hasPdf
      ? typeof d.fileName === 'string' &&
        d.fileName.length > 0 &&
        Array.from(d.fileName).length <= 255 &&
        integer(d.pdfSizeBytes) &&
        d.pdfSizeBytes > 0 &&
        d.pdfSizeBytes <= 20 * 1024 * 1024
      : d.fileName === null &&
        d.pdfSizeBytes === null &&
        d.pageCount === null) &&
    (d.pageCount === null ||
      (integer(d.pageCount) && d.pageCount >= 1 && d.pageCount <= 200)) &&
    (d.archivedAt === null || date(d.archivedAt)) &&
    date(d.createdAt) &&
    date(d.updatedAt)
  );
}
export function isDocumentDetail(value: unknown): value is DocumentDetail {
  return (
    isDocument(value) &&
    'text' in value &&
    (value.text === null ||
      (typeof value.text === 'string' &&
        Array.from(value.text).length <= 500000))
  );
}
export function isDocumentPage(value: unknown): value is DocumentPage {
  if (!value || typeof value !== 'object') return false;
  const p = value as DocumentPage;
  return (
    Array.isArray(p.items) &&
    p.items.length <= 20 &&
    p.items.every(isDocument) &&
    integer(p.total) &&
    p.total >= p.items.length &&
    integer(p.page) &&
    p.page > 0 &&
    p.pageSize === 20 &&
    (p.nextPage === null || p.nextPage === p.page + 1) &&
    (p.previousPage === null ||
      (p.previousPage === p.page - 1 && p.previousPage > 0))
  );
}
