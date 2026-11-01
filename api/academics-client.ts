import { ApiError, jsonRequest } from './json-client.ts';
import {
  isAcademicOverview,
  isScheduledCourse,
  type AcademicOverview,
  type ScheduledCourseInput,
} from '../libs/types/academics.ts';

export async function readAcademics(
  signal?: AbortSignal,
): Promise<AcademicOverview> {
  const result = await jsonRequest('/api/academics', undefined, undefined, {
    signal,
  });
  if (!isAcademicOverview(result))
    throw new ApiError(503, 'unavailable', 'Unable to load semesters.');
  return result;
}
export async function saveAcademic(
  path: string,
  payload: unknown = {},
  method: 'POST' | 'PATCH' = 'POST',
) {
  return jsonRequest(`/api/academics/${path}`, payload, method);
}
export async function saveScheduledCourse(
  payload: ScheduledCourseInput,
  id?: string,
) {
  return jsonRequest(
    `/api/courses${id ? `/${id}` : ''}`,
    payload,
    id ? 'PATCH' : 'POST',
  );
}
export async function previewImport(
  url: string,
): Promise<ScheduledCourseInput[]> {
  const value = await jsonRequest(
    '/api/academics/import/preview',
    { url },
    'POST',
    { timeoutMs: 40000 },
  );
  if (
    !value ||
    typeof value !== 'object' ||
    !('courses' in value) ||
    !Array.isArray(value.courses) ||
    !value.courses.length ||
    value.courses.length > 50 ||
    !value.courses.every(isScheduledCourse)
  )
    throw new ApiError(
      503,
      'invalid_timetable',
      'Unable to read the timetable.',
    );
  return value.courses;
}
export function academicError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.code === 'term_archived')
      return 'This semester is archived and read-only.';
    if (cause.code === 'import_conflict')
      return 'This import has already been saved with different details. Start a new preview.';
    if (cause.code === 'invalid_timetable')
      return 'Use a public Everytime share link, or add courses manually.';
    if (cause.status === 400)
      return 'Check the names, selected semester, and class times.';
    if (cause.status === 403)
      return 'Your session expired or this workspace is read-only.';
    if (cause.status === 404)
      return 'This semester or timetable is no longer available. Refresh and try again.';
  }
  return 'Unable to update your timetable. Refresh before retrying in case the change was saved.';
}
