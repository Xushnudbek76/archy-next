import Link from 'next/link';
import type { Course } from '@/libs/types/courses';
import { layoutDay, minutes, weekDays } from './schedule';

export function TimetableGrid({ courses }: { courses: Course[] }) {
  const slots = courses.flatMap((course) => course.schedules ?? []);
  const start = Math.min(
    9 * 60,
    ...slots.map((slot) => Math.floor(minutes(slot.startTime) / 60) * 60),
  );
  const end = Math.max(
    18 * 60,
    ...slots.map((slot) => Math.ceil(minutes(slot.endTime) / 60) * 60),
  );
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, index) => start / 60 + index,
  );
  return (
    <div
      className="timetable-scroll"
      tabIndex={0}
      aria-label="Weekly timetable, scroll to view all days"
    >
      <div
        className="timetable-grid"
        role="group"
        aria-label="Weekly class schedule"
      >
        <div className="timetable-times" style={{ height: end - start + 38 }}>
          <span>Time</span>
          {hours.slice(0, -1).map((hour) => (
            <time key={hour} style={{ top: 38 + hour * 60 - start }}>
              {String(hour).padStart(2, '0')}:00
            </time>
          ))}
        </div>
        {weekDays.map((day, index) => (
          <section className="timetable-column" key={day} aria-label={day}>
            <h3>{day}</h3>
            <div className="timetable-day" style={{ height: end - start }}>
              {hours.slice(0, -1).map((hour) => (
                <div
                  className="timetable-hour"
                  key={hour}
                  style={{ top: hour * 60 - start }}
                />
              ))}
              {layoutDay(courses, index).map((event) => (
                <Link
                  key={event.key}
                  href={`/documents?courseId=${event.course.id}`}
                  className="timetable-event"
                  style={{
                    top: minutes(event.startTime) - start,
                    height: minutes(event.endTime) - minutes(event.startTime),
                    left: `${(100 * event.lane) / event.lanes}%`,
                    width: `${100 / event.lanes}%`,
                    borderColor: event.course.color ?? 'var(--accent)',
                  }}
                >
                  <strong>{event.course.title}</strong>
                  <span>
                    {event.startTime}–{event.endTime}
                  </span>
                  {event.room ? <span>{event.room}</span> : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
