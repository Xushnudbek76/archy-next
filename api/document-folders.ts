import { jsonRequest } from './json-client';
import { isCourseList, type Course } from '@/libs/types/courses';
export async function documentFolders(signal: AbortSignal): Promise<Course[]> {
  const folders: Course[] = [];
  let page: number | null = 1;
  while (page !== null) {
    const response = await jsonRequest(
      `/api/courses?archived=false&page=${page}`,
      undefined,
      undefined,
      { signal },
    );
    if (
      !isCourseList(response) ||
      (response.nextPage !== null && response.nextPage !== page + 1)
    )
      throw new Error('Invalid folders response');
    folders.push(...response.items);
    page = response.nextPage;
  }
  return folders;
}
