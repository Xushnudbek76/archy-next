'use client';

import { useCourses } from '@/libs/hooks/useCourses';
import { createCourse } from '@/api/courses-client';
import { CourseForm } from './CourseForm';
import { CourseCard } from './CourseCard';

export function CoursesWorkspace() {
  const { list, loading, loadError, error, pending, query, navigate, mutate } =
    useCourses();
  return (
    <section className="page-content">
      <p className="eyebrow">KEEP THE BIGGER PICTURE</p>
      <h1>Your courses</h1>
      <p className="page-intro">
        A home for the subjects you study and the ideas you discover.
      </p>
      <div className="course-toolbar" aria-label="Course views">
        <button
          className="course-button"
          aria-pressed={!query.archived}
          disabled={pending || loading}
          onClick={() => navigate(false, 1)}
        >
          Active
        </button>
        <button
          className="course-button"
          aria-pressed={query.archived}
          disabled={pending || loading}
          onClick={() => navigate(true, 1)}
        >
          Archived
        </button>
        <button
          className="course-button course-refresh"
          disabled={pending || loading}
          onClick={() => navigate()}
        >
          Refresh courses
        </button>
      </div>
      {!query.archived ? (
        <div className="course-create">
          <h2>Add a course</h2>
          <CourseForm
            pending={pending || loading}
            onSave={(title) => mutate(() => createCourse(title))}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" aria-label="Course error" className="course-error">
          {error}
        </p>
      ) : null}
      <div aria-busy={loading}>
        {loading ? (
          <p role="status" className="course-caption">
            Loading courses…
          </p>
        ) : loadError ? (
          <div className="course-load-error">
            <p role="alert" aria-label="Course error" className="course-error">
              {loadError}
            </p>
            <button className="course-button" onClick={() => navigate()}>
              Retry
            </button>
          </div>
        ) : list?.items.length === 0 ? (
          <div className="empty-state course-empty">
            <h2>{query.archived ? 'No archived courses' : 'No courses yet'}</h2>
            <p>
              {query.archived
                ? 'Courses you archive will appear here.'
                : 'Add your first course to start organizing your learning.'}
            </p>
          </div>
        ) : (
          <>
            <p className="course-caption">
              {list?.total} {query.archived ? 'archived' : 'active'}{' '}
              {list?.total === 1 ? 'course' : 'courses'}
            </p>
            <div className="course-grid">
              {list?.items.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  pending={pending}
                  mutate={mutate}
                />
              ))}
            </div>
            {query.page > 1 || list?.nextPage ? (
              <div className="course-pagination" aria-label="Course pages">
                <button
                  className="course-button"
                  disabled={pending || query.page === 1}
                  onClick={() => navigate(query.archived, query.page - 1)}
                >
                  Previous
                </button>
                <span>Page {query.page}</span>
                <button
                  className="course-button"
                  disabled={pending || !list?.nextPage}
                  onClick={() => navigate(query.archived, list!.nextPage!)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
