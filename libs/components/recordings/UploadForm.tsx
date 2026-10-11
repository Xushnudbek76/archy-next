'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { listCourses } from '@/api/courses-client';
import type { CourseList } from '@/libs/types/courses';

export function UploadForm({
  pending,
  onUpload,
}: {
  pending: boolean;
  onUpload: (file: File, courseId: string, title: string) => Promise<boolean>;
}) {
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<CourseList | null>(null);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    listCourses(false, page).then(
      (value) => {
        if (!cancelled) {
          setCourses(value);
          setCourseId(value.items[0]?.id ?? '');
          setError('');
        }
      },
      () => {
        if (!cancelled)
          setError('Courses could not be loaded. Please try again.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, revision]);
  return (
    <div className="course-create recording-upload">
      <h2>Upload a lecture</h2>
      <p className="course-caption">
        MP3, M4A, WAV, FLAC, Ogg or WebM. No duration limit.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            className="course-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry courses
          </button>
        </div>
      ) : !courses ? (
        <p role="status">Loading courses…</p>
      ) : courses.total === 0 ? (
        <p>
          <Link className="text-link" href="/courses">
            Add a course
          </Link>{' '}
          before uploading your first lecture.
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const file = input.current?.files?.[0];
            if (file && (await onUpload(file, courseId, title))) {
              setTitle('');
              if (input.current) input.current.value = '';
            }
          }}
        >
          <fieldset disabled={pending}>
            <label htmlFor="recording-course">Course</label>
            <select
              id="recording-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              required
            >
              {courses.items.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {page > 1 || courses.nextPage ? (
              <div className="course-pagination">
                <button
                  type="button"
                  className="course-button"
                  disabled={page === 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous courses
                </button>
                <span>Page {page}</span>
                <button
                  type="button"
                  className="course-button"
                  disabled={!courses.nextPage}
                  onClick={() => setPage(courses.nextPage!)}
                >
                  More courses
                </button>
              </div>
            ) : null}
            <label htmlFor="recording-title">Recording title</label>
            <input
              id="recording-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="e.g. Introduction to physics"
            />
            <label htmlFor="recording-file">Audio file</label>
            <input
              id="recording-file"
              type="file"
              ref={input}
              accept="audio/*,.m4a,.webm,.flac,.ogg"
              required
            />
            <button className="course-button course-primary" type="submit">
              Upload audio
            </button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
