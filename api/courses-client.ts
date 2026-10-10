import { ApiError, jsonRequest } from './json-client.ts';
import { isCourse, isCourseList, type Course } from '../libs/types/courses.ts';

function invalidResponse(): never {
  throw new ApiError(
    503,
    'unavailable',
    'Archy is temporarily unavailable. Please try again.',
  );
}

export async function listCourses(archived: boolean, page: number) {
  const value = await jsonRequest(
    `/api/courses?archived=${archived}&page=${page}`,
  );
  return isCourseList(value) ? value : invalidResponse();
}

async function save(
  path: string,
  payload: unknown,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<Course> {
  const value = await jsonRequest(path, payload, method);
  return isCourse(value) ? value : invalidResponse();
}

export const createCourse = (title: string) => save('/api/courses', { title });
export const renameCourse = (id: string, title: string) =>
  save(`/api/courses/${id}`, { title }, 'PATCH');
export const archiveCourse = (id: string) =>
  save(`/api/courses/${id}/archive`, {});

export function courseError(cause: unknown): string {
  if (!(cause instanceof ApiError))
    return 'Unable to update your courses. Please try again.';
  if (cause.status === 503)
    return 'Archy is temporarily unavailable. Please try again.';
  if (cause.status === 400)
    return 'Use a course title between 1 and 100 characters.';
  if (cause.status === 404)
    return 'This course is no longer available. Refresh your courses.';
  if (cause.status === 401 || cause.status === 403)
    return 'Your session expired. Please sign in again.';
  return cause.message;
}
