'use client';

import { useState } from 'react';
import type { Course } from '@/libs/types/courses';
import { archiveCourse, renameCourse } from '@/api/courses-client';
import { CourseForm } from './CourseForm';

export function CourseCard({
  course,
  pending,
  mutate,
}: {
  course: Course;
  pending: boolean;
  mutate: (operation: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [action, setAction] = useState<'rename' | 'archive' | null>(null);
  return (
    <article className="course-card" aria-label={course.title}>
      <h2>{course.title}</h2>
      <p className="course-caption">
        {course.archivedAt ? 'Archived' : 'Ready for your study material'}
      </p>
      {course.archivedAt ? null : action === 'rename' ? (
        <CourseForm
          initialTitle={course.title}
          pending={pending}
          onCancel={() => setAction(null)}
          onSave={async (title) => {
            const saved = await mutate(() => renameCourse(course.id, title));
            if (saved) setAction(null);
            return saved;
          }}
        />
      ) : action === 'archive' ? (
        <div>
          <p className="course-caption">
            Move this course to Archived? Your course will be kept.
          </p>
          <div className="course-actions">
            <button
              className="course-button"
              disabled={pending}
              onClick={async () => {
                if (await mutate(() => archiveCourse(course.id)))
                  setAction(null);
              }}
            >
              Confirm archive
            </button>
            <button
              className="course-button"
              disabled={pending}
              onClick={() => setAction(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="course-actions">
          <button
            className="course-button"
            disabled={pending}
            onClick={() => setAction('rename')}
          >
            Rename
          </button>
          <button
            className="course-button"
            disabled={pending}
            onClick={() => setAction('archive')}
          >
            Archive
          </button>
        </div>
      )}
    </article>
  );
}
