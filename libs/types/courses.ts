export type Course = {
  id: string;
  title: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CourseList = {
  items: Course[];
  total: number;
  nextPage: number | null;
};

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== 'object') return false;
  const course = value as Partial<Course>;
  return (
    typeof course.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      course.id,
    ) &&
    typeof course.title === 'string' &&
    course.title.trim().length > 0 &&
    (course.archivedAt === null || isDate(course.archivedAt)) &&
    isDate(course.createdAt) &&
    isDate(course.updatedAt)
  );
}

export function isCourseList(value: unknown): value is CourseList {
  if (!value || typeof value !== 'object') return false;
  const list = value as Partial<CourseList>;
  return (
    Array.isArray(list.items) &&
    list.items.length <= 20 &&
    list.items.every(isCourse) &&
    Number.isSafeInteger(list.total) &&
    list.total! >= list.items.length &&
    (list.nextPage === null ||
      (Number.isSafeInteger(list.nextPage) && list.nextPage! > 1))
  );
}
