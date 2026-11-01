import assert from 'node:assert/strict';
import test from 'node:test';
import {
  layoutDay,
  todayClasses,
} from '../libs/components/academics/schedule.ts';
import { isAcademicOverview } from '../libs/types/academics.ts';
import type { Course } from '../libs/types/courses.ts';

const course = (id: string, startTime: string, endTime: string): Course => ({
  id,
  title: id,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  schedules: [{ days: [0], startTime, endTime, room: '301' }],
});
test('today uses the Korean campus day across UTC midnight', () => {
  const courses = [course('a', '09:00', '10:00')];
  assert.equal(
    todayClasses(courses, new Date('2026-11-01T23:30:00Z')).length,
    1,
  );
  assert.equal(
    todayClasses(courses, new Date('2026-11-01T12:30:00Z')).length,
    0,
  );
});
test('overlapping classes have separate lanes while later classes use the full width', () => {
  const events = layoutDay(
    [
      course('a', '09:00', '11:00'),
      course('b', '10:00', '12:00'),
      course('c', '11:00', '12:00'),
      course('d', '15:00', '16:00'),
    ],
    0,
  );
  assert.deepEqual(
    events.map((event) => [event.lane, event.lanes]),
    [
      [0, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ],
  );
});
test('academic contracts reject dangling selections and invalid semester data', () => {
  assert.equal(
    isAcademicOverview({
      terms: [],
      timetables: [],
      selectedTimetableId: null,
    }),
    true,
  );
  assert.equal(
    isAcademicOverview({
      terms: [],
      timetables: [],
      selectedTimetableId: 'not-an-id',
    }),
    false,
  );
  assert.equal(
    isAcademicOverview({
      terms: [{ id: 12 }],
      timetables: [],
      selectedTimetableId: null,
    }),
    false,
  );
});
