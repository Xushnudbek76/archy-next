'use client';
import { useState } from 'react';
import Link from 'next/link';
import { saveAcademic, saveScheduledCourse } from '@/api/academics-client';
import { useAcademicWorkspace } from '@/libs/hooks/useAcademicWorkspace';
import { useDemo } from '@/libs/hooks/useDemo';
import { Icon } from '@/libs/components/common/Icon';
import { TimetableGrid } from './TimetableGrid';
import { TimetableSelector } from './TimetableSelector';
import { AcademicManager } from './AcademicManager';
import { CourseEditor } from './CourseEditor';
import { TimetableImport } from './TimetableImport';

export function TimetableWorkspace() {
  const workspace = useAcademicWorkspace();
  const demo = useDemo();
  const [viewId, setViewId] = useState('');
  const [editing, setEditing] = useState('');
  const [rename, setRename] = useState(false);
  const { data, courses, mutate } = workspace;
  const id =
    viewId || data?.selectedTimetableId || data?.timetables[0]?.id || '';
  const table = data?.timetables.find((item) => item.id === id);
  const term = data?.terms.find((item) => item.id === table?.termId);
  const selectedCourses = courses.filter((course) => course.timetableId === id);
  const disabled = demo || workspace.pending || workspace.loading;
  const readOnly = disabled || !!term?.archivedAt;
  return (
    <section className="page-content academic-page">
      <header className="academic-heading">
        <div>
          <p className="eyebrow">YOUR SEMESTER, AT A GLANCE</p>
          <h1>Class timetable</h1>
          <p className="page-intro">
            See your week and keep each semester in its own space.
          </p>
        </div>
        <Icon name="calendar" size={32} />
      </header>
      {workspace.loading ? (
        <p role="status">Loading your timetable…</p>
      ) : workspace.loadError ? (
        <div role="alert">
          <p>{workspace.loadError}</p>
          <button className="secondary-button" onClick={workspace.refresh}>
            Try again
          </button>
        </div>
      ) : data ? (
        <>
          {workspace.error ? (
            <p role="alert" className="course-error">
              {workspace.error}
            </p>
          ) : null}
          <div className="timetable-toolbar">
            <TimetableSelector
              data={data}
              value={id}
              onChange={(value) => {
                setViewId(value);
                setEditing('');
                setRename(false);
              }}
              disabled={workspace.pending}
            />
            {table ? (
              <div className="academic-actions">
                <button
                  className="secondary-button"
                  disabled={readOnly || data.selectedTimetableId === id}
                  onClick={() =>
                    void mutate(() => saveAcademic(`timetables/${id}/select`))
                  }
                >
                  Use on home
                </button>
                <button
                  className="secondary-button"
                  disabled={readOnly || table.isPrimary}
                  onClick={() =>
                    void mutate(() => saveAcademic(`timetables/${id}/primary`))
                  }
                >
                  {table.isPrimary ? 'Primary timetable' : 'Make primary'}
                </button>
                <button
                  className="secondary-button"
                  disabled={readOnly}
                  onClick={() => setRename((value) => !value)}
                >
                  Rename
                </button>
                <button
                  className="primary-button"
                  disabled={readOnly}
                  onClick={() => setEditing('new')}
                >
                  <Icon name="plus" size={17} />
                  Add class
                </button>
              </div>
            ) : null}
          </div>
          {table && rename ? (
            <form
              className="academic-form surface inline-rename"
              onSubmit={async (event) => {
                event.preventDefault();
                const name = String(
                  new FormData(event.currentTarget).get('name'),
                );
                if (
                  await mutate(() =>
                    saveAcademic(`timetables/${id}`, { name }, 'PATCH'),
                  )
                )
                  setRename(false);
              }}
            >
              <label>
                Timetable name
                <input
                  name="name"
                  required
                  maxLength={60}
                  defaultValue={table.name}
                />
              </label>
              <button className="primary-button" disabled={readOnly}>
                Save name
              </button>
            </form>
          ) : null}
          {table ? (
            <>
              <div className="academic-section-heading">
                <h2>
                  {term?.name} · {table.name}
                </h2>
                <span>
                  {term?.archivedAt
                    ? 'Archived · Read-only'
                    : 'Class times · Asia/Seoul'}
                </span>
              </div>
              {editing ? (
                <CourseEditor
                  key={editing}
                  initial={courses.find((course) => course.id === editing)}
                  timetableId={id}
                  pending={readOnly}
                  onCancel={() => setEditing('')}
                  onSave={async (value) => {
                    const saved = await mutate(() =>
                      saveScheduledCourse(
                        value,
                        editing === 'new' ? undefined : editing,
                      ),
                    );
                    if (saved) setEditing('');
                    return saved;
                  }}
                />
              ) : null}
              <TimetableGrid courses={selectedCourses} />
              {!selectedCourses.length ? (
                <p className="muted">
                  No classes in this timetable yet. Add a class or import a
                  public timetable below.
                </p>
              ) : (
                <div className="course-grid timetable-course-list">
                  {selectedCourses.map((course) => (
                    <article className="course-card" key={course.id}>
                      <h3>{course.title}</h3>
                      <p className="muted">
                        {course.professor || 'Professor not set'}
                      </p>
                      <div className="academic-actions">
                        <Link
                          className="text-link"
                          href={`/documents?courseId=${course.id}`}
                        >
                          Open materials <Icon name="arrow" size={16} />
                        </Link>
                        <button
                          className="secondary-button"
                          disabled={readOnly || course.readOnly}
                          onClick={() => setEditing(course.id)}
                        >
                          Edit class
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <TimetableImport
                key={id}
                timetableId={id}
                disabled={readOnly}
                mutate={mutate}
              />
            </>
          ) : (
            <div className="empty-state">
              <Icon name="calendar" size={32} />
              <h2>Give this semester a home</h2>
              <p>
                Add a semester and a timetable below, then start filling in your
                week.
              </p>
            </div>
          )}
          <AcademicManager data={data} disabled={disabled} mutate={mutate} />
        </>
      ) : null}
    </section>
  );
}
