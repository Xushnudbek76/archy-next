export type AcademicTerm = {
  id: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
};
export type Timetable = {
  id: string;
  termId: string;
  name: string;
  isPrimary: boolean;
  createdAt: string;
};
export type AcademicOverview = {
  terms: AcademicTerm[];
  timetables: Timetable[];
  selectedTimetableId: string | null;
};
export type ScheduleInput = {
  days: number[];
  startTime: string;
  endTime: string;
  room: string;
};
export type ScheduledCourseInput = {
  title: string;
  professor: string;
  color: string;
  timetableId?: string | null;
  schedules: ScheduleInput[];
};

const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isAcademicOverview(value: unknown): value is AcademicOverview {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AcademicOverview>;
  if (
    !Array.isArray(data.terms) ||
    data.terms.length > 100 ||
    !Array.isArray(data.timetables) ||
    data.timetables.length > 100
  )
    return false;
  if (
    !data.terms.every(
      (item) =>
        item &&
        uuid(item.id) &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        Array.from(item.name).length <= 60 &&
        (item.archivedAt === null || date(item.archivedAt)) &&
        date(item.createdAt),
    )
  )
    return false;
  if (
    !data.timetables.every(
      (item) =>
        item &&
        uuid(item.id) &&
        uuid(item.termId) &&
        data.terms!.some((term) => term.id === item.termId) &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        Array.from(item.name).length <= 60 &&
        typeof item.isPrimary === 'boolean' &&
        date(item.createdAt),
    )
  )
    return false;
  return (
    data.selectedTimetableId === null ||
    (uuid(data.selectedTimetableId) &&
      data.timetables.some((item) => item.id === data.selectedTimetableId))
  );
}

export function isScheduledCourse(
  value: unknown,
): value is ScheduledCourseInput {
  if (!value || typeof value !== 'object') return false;
  const course = value as Partial<ScheduledCourseInput>;
  const time = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
  return (
    typeof course.title === 'string' &&
    course.title.trim().length > 0 &&
    Array.from(course.title).length <= 100 &&
    typeof course.professor === 'string' &&
    Array.from(course.professor).length <= 100 &&
    typeof course.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(course.color) &&
    Array.isArray(course.schedules) &&
    course.schedules.length <= 14 &&
    course.schedules.every(
      (slot) =>
        slot &&
        Array.isArray(slot.days) &&
        slot.days.length > 0 &&
        slot.days.length <= 7 &&
        new Set(slot.days).size === slot.days.length &&
        slot.days.every(
          (day) => Number.isInteger(day) && day >= 0 && day <= 6,
        ) &&
        typeof slot.startTime === 'string' &&
        time.test(slot.startTime) &&
        typeof slot.endTime === 'string' &&
        time.test(slot.endTime) &&
        slot.startTime < slot.endTime &&
        typeof slot.room === 'string' &&
        Array.from(slot.room).length <= 100,
    )
  );
}
