'use client';
import { useRef, useState } from 'react';
import {
  academicError,
  previewImport,
  saveAcademic,
} from '@/api/academics-client';
import type { ScheduledCourseInput } from '@/libs/types/academics';
import { CourseEditor } from './CourseEditor';

export function TimetableImport({
  timetableId,
  disabled,
  mutate,
}: {
  timetableId: string;
  disabled: boolean;
  mutate: (operation: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [courses, setCourses] = useState<ScheduledCourseInput[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const requestId = useRef('');
  const fetching = useRef(false);
  return (
    <section className="timetable-import surface" aria-label="Import timetable">
      <h2>Bring your timetable from Everytime</h2>
      <p className="muted">
        Paste a public share link, review the classes, and save them to this
        timetable.
      </p>
      <form
        className="academic-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (fetching.current) return;
          fetching.current = true;
          setLoading(true);
          setError('');
          const url = String(new FormData(event.currentTarget).get('url'));
          try {
            setCourses(await previewImport(url));
            requestId.current = crypto.randomUUID();
            setEditing(null);
          } catch (cause) {
            setError(academicError(cause));
          } finally {
            setLoading(false);
            fetching.current = false;
          }
        }}
      >
        <fieldset disabled={disabled || loading}>
          <label>
            Everytime share link
            <input
              name="url"
              type="url"
              maxLength={300}
              required
              placeholder="https://everytime.kr/@…"
            />
          </label>
          <button className="secondary-button">
            {loading ? 'Reading timetable…' : 'Preview classes'}
          </button>
        </fieldset>
      </form>
      {error ? (
        <p className="course-error" role="alert">
          {error}
        </p>
      ) : null}
      {courses ? (
        <div className="import-preview">
          <h3>Review {courses.length} classes before saving</h3>
          <ul>
            {courses.map((course, index) => (
              <li key={index}>
                <div>
                  <strong>{course.title}</strong>
                  <p>
                    {course.professor || 'Professor not set'} ·{' '}
                    {course.schedules.length} class times
                  </p>
                </div>
                <button
                  className="secondary-button"
                  disabled={disabled || loading}
                  onClick={() => setEditing(index)}
                >
                  Edit {course.title}
                </button>
              </li>
            ))}
          </ul>
          {editing !== null && courses[editing] ? (
            <CourseEditor
              key={editing}
              initial={courses[editing]}
              timetableId={timetableId}
              pending={disabled || loading}
              onCancel={() => setEditing(null)}
              onSave={async (value) => {
                setCourses((items) =>
                  items!.map((item, index) =>
                    index === editing ? value : item,
                  ),
                );
                setEditing(null);
                return true;
              }}
            />
          ) : null}
          <div className="academic-actions">
            <button
              className="primary-button"
              disabled={disabled || loading || editing !== null}
              onClick={async () => {
                if (
                  await mutate(() =>
                    saveAcademic('import/confirm', {
                      requestId: requestId.current,
                      timetableId,
                      courses,
                    }),
                  )
                )
                  setCourses(null);
              }}
            >
              Save reviewed classes
            </button>
            <button
              className="secondary-button"
              disabled={disabled || loading}
              onClick={() => {
                setCourses(null);
                setEditing(null);
              }}
            >
              Discard preview
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
