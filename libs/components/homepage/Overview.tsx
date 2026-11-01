'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/libs/components/common/Icon';
import { useAcademicWorkspace } from '@/libs/hooks/useAcademicWorkspace';
import { useDocuments } from '@/libs/hooks/useDocuments';
import { useDemo } from '@/libs/hooks/useDemo';
import { saveAcademic } from '@/api/academics-client';
import { TimetableSelector } from '@/libs/components/academics/TimetableSelector';
import {
  campusClock,
  todayClasses,
} from '@/libs/components/academics/schedule';

export function Overview() {
  const workspace = useAcademicWorkspace();
  const documents = useDocuments();
  const demo = useDemo();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const data = workspace.data;
  const courses = data?.selectedTimetableId
    ? workspace.courses.filter(
        (course) => course.timetableId === data.selectedTimetableId,
      )
    : workspace.courses.filter((course) => !course.timetableId);
  const today = now ? todayClasses(courses, now) : [];
  const next = now
    ? today.find((slot) => slot.endTime > campusClock(now).time)
    : null;
  return (
    <section className="dashboard-page">
      <section className="dashboard-hero surface">
        <p className="eyebrow">YOUR CAMPUS WORKSPACE</p>
        <h1>
          {next ? "Record today's class" : 'Ready for your next lecture?'}
        </h1>
        {next ? (
          <>
            <h2>{next.course.title}</h2>
            <p>
              {next.startTime}–{next.endTime}
              {next.room ? ` · ${next.room}` : ''}
            </p>
          </>
        ) : (
          <p>
            Bring your lectures, materials, and ideas together.
            <br />
            Make a little more room to understand.
          </p>
        )}
        {demo ? (
          <button disabled className="primary-button">
            <Icon name="mic" />
            Start recording
          </button>
        ) : (
          <Link
            className="primary-button"
            href={next ? `/record?courseId=${next.course.id}` : '/record'}
          >
            <Icon name="mic" />
            Start recording
          </Link>
        )}
        <Link href="/documents" className="dashboard-secondary">
          Open my documents <Icon name="arrow" size={17} />
        </Link>
      </section>
      {workspace.error ? (
        <p role="alert" className="course-error">
          {workspace.error}
        </p>
      ) : null}
      {data?.timetables.length ? (
        <div className="dashboard-timetable-selector">
          <TimetableSelector
            data={data}
            value={data.selectedTimetableId ?? ''}
            disabled={demo || workspace.pending}
            onChange={(id) => {
              if (id)
                void workspace.mutate(() =>
                  saveAcademic(`timetables/${id}/select`),
                );
            }}
          />
          <Link className="text-link" href="/timetable">
            Manage timetable <Icon name="arrow" size={16} />
          </Link>
        </div>
      ) : null}
      <section
        className="dashboard-panel surface"
        aria-labelledby="dashboard-courses"
      >
        <header className="section-heading">
          <div>
            <h2 id="dashboard-courses">Course folders</h2>
            <p>Jump straight into the materials for your classes.</p>
          </div>
          <Link className="secondary-button" href="/courses">
            View all
          </Link>
        </header>
        {workspace.loading ? (
          <p role="status">Loading your courses…</p>
        ) : workspace.loadError ? (
          <div role="alert">
            <p>{workspace.loadError}</p>
            <button className="secondary-button" onClick={workspace.refresh}>
              Try again
            </button>
          </div>
        ) : courses.length ? (
          <div className="dashboard-course-grid">
            {courses.slice(0, 6).map((course) => (
              <Link
                className="dashboard-course-card"
                key={course.id}
                href={`/documents?courseId=${course.id}`}
              >
                <div className="dashboard-course-title">
                  <span className="dashboard-course-icon">
                    <Icon name="book" size={22} />
                  </span>
                  <div>
                    <h3>{course.title}</h3>
                    <p>{course.professor || 'Professor not set'}</p>
                  </div>
                </div>
                <span className="dashboard-course-meta">
                  {course.schedules?.length
                    ? `${course.schedules.length} scheduled class ${course.schedules.length === 1 ? 'time' : 'times'}`
                    : 'Your study materials, together'}
                </span>
                <span className="text-link">
                  Open workspace <Icon name="arrow" size={18} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <Icon name="courses" size={28} />
            <h3>Your semester starts here</h3>
            <p>
              Add your classes to organize your materials and see your week.
            </p>
            <Link className="secondary-button" href="/timetable">
              Set up your timetable
            </Link>
          </div>
        )}
      </section>
      {today.length ? (
        <section className="dashboard-panel surface">
          <header className="section-heading">
            <h2>Today’s classes</h2>
            <span>Asia/Seoul</span>
          </header>
          <div className="today-classes">
            {today.map((slot, index) => (
              <Link
                href={`/documents?courseId=${slot.course.id}`}
                key={`${slot.course.id}:${index}`}
              >
                <time>
                  {slot.startTime}–{slot.endTime}
                </time>
                <strong>{slot.course.title}</strong>
                <span>{slot.room || 'Room not set'}</span>
                <Icon name="chevron" size={18} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section
        className="dashboard-panel surface"
        aria-labelledby="dashboard-recent"
      >
        <header className="section-heading">
          <div>
            <h2 id="dashboard-recent">Recent materials</h2>
            <p>Pick up where you left off.</p>
          </div>
          <Link className="secondary-button" href="/documents">
            View all
          </Link>
        </header>
        {documents.loading ? (
          <p role="status">Loading recent materials…</p>
        ) : documents.error ? (
          <div role="alert">
            <p>{documents.error}</p>
            <button className="secondary-button" onClick={documents.reload}>
              Try again
            </button>
          </div>
        ) : documents.data?.items.length ? (
          <div className="recent-materials">
            {documents.data.items.slice(0, 4).map((document) => (
              <Link key={document.id} href={`/documents/${document.id}`}>
                <span className="dashboard-course-icon">
                  <Icon name={document.hasPdf ? 'document' : 'audio'} />
                </span>
                <div>
                  <strong>{document.title}</strong>
                  <p>
                    {document.hasPdf
                      ? 'PDF material'
                      : document.recordingId
                        ? 'Lecture recording'
                        : 'Study document'}
                  </p>
                </div>
                <Icon name="chevron" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <h3>Your first lecture belongs here</h3>
            <p>Add a PDF or recording to start your study workspace.</p>
            <Link href="/documents" className="text-link">
              Open documents <Icon name="arrow" size={17} />
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
