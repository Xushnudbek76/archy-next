import type { Course } from '../../types/courses.ts';

export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function campusClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: weekDays.indexOf(value('weekday')),
    time: `${value('hour')}:${value('minute')}`,
  };
}
export function todayClasses(courses: Course[], date: Date) {
  const { weekday } = campusClock(date);
  return courses
    .flatMap((course) =>
      (course.schedules ?? [])
        .filter((slot) => slot.days.includes(weekday))
        .map((slot) => ({ ...slot, course })),
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function layoutDay(courses: Course[], day: number) {
  const events = courses
    .flatMap((course) =>
      (course.schedules ?? []).flatMap((slot, index) =>
        slot.days.includes(day)
          ? [
              {
                ...slot,
                course,
                key: `${course.id}:${index}`,
                lane: 0,
                lanes: 1,
              },
            ]
          : [],
      ),
    )
    .sort(
      (a, b) =>
        a.startTime.localeCompare(b.startTime) ||
        a.endTime.localeCompare(b.endTime),
    );
  let active: typeof events = [];
  let group: typeof events = [];
  const finish = () => {
    const width = Math.max(1, ...group.map((event) => event.lane + 1));
    group.forEach((event) => {
      event.lanes = width;
    });
  };
  for (const event of events) {
    active = active.filter((item) => item.endTime > event.startTime);
    if (!active.length) {
      finish();
      group = [];
    }
    const occupied = new Set(active.map((item) => item.lane));
    while (occupied.has(event.lane)) event.lane++;
    active.push(event);
    group.push(event);
  }
  finish();
  return events;
}
