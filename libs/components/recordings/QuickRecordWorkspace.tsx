'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { createDocument, documentError } from '@/api/documents-client';
import { useDemo } from '@/libs/hooks/useDemo';
import { useDocumentFolders } from '@/libs/hooks/useDocumentFolders';
import { useDocuments } from '@/libs/hooks/useDocuments';
import type { Document } from '@/libs/types/documents';
import { Icon } from '@/libs/components/common/Icon';
import { BrowserRecorder } from './BrowserRecorder';

export function QuickRecordWorkspace({
  initialCourseId = '',
}: {
  initialCourseId?: string;
}) {
  const readOnly = useDemo();
  const folders = useDocumentFolders();
  const documents = useDocuments({ page: 1, courseId: initialCourseId });
  const [courseId, setCourseId] = useState(initialCourseId);
  const [selected, setSelected] = useState('');
  const [target, setTarget] = useState<Document | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const preparing = useRef(false);
  const course = folders.folders.find((item) => item.id === courseId);
  const ready = folders.ready && !!course && !course.readOnly && !readOnly;
  return (
    <section className="page-content quick-record-page">
      <header className="quick-record-heading">
        <span className="quick-record-icon">
          <Icon name="mic" size={28} />
        </span>
        <p className="eyebrow">FOCUS ON THE EXPLANATION</p>
        <h1>Record your lecture</h1>
        <p className="page-intro">
          Choose where it belongs. Record, pause, and pick up again when you’re
          ready.
        </p>
      </header>
      {target ? (
        <section className="surface quick-record-card">
          <p className="muted">{course?.title}</p>
          <h2>{target.title}</h2>
          <BrowserRecorder
            documentId={target.id}
            courseId={target.courseId}
            initialTitle={target.title}
            onSaved={() => setSaved(true)}
          />
          {saved ? (
            <div className="recording-saved">
              <p role="status">Your recording is saved with this document.</p>
              <Link className="primary-button" href={`/documents/${target.id}`}>
                Open study workspace <Icon name="arrow" size={18} />
              </Link>
            </div>
          ) : (
            <Link className="text-link" href={`/documents/${target.id}`}>
              Open document
            </Link>
          )}
        </section>
      ) : (
        <section className="surface quick-record-card">
          {folders.error ? (
            <p role="alert">
              {folders.error}{' '}
              <button className="text-link" onClick={folders.retry}>
                Try again
              </button>
            </p>
          ) : !folders.ready ? (
            <p role="status">Loading course folders…</p>
          ) : !folders.folders.some((item) => !item.readOnly) ? (
            <div className="dashboard-empty">
              <h2>Start with a course folder</h2>
              <p>
                Create a course to keep your recordings and study material
                together.
              </p>
              <Link href="/courses" className="primary-button">
                Add a course
              </Link>
            </div>
          ) : null}
          <form
            className="academic-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!ready || preparing.current) return;
              preparing.current = true;
              setPending(true);
              setError('');
              const title = String(
                new FormData(event.currentTarget).get('title'),
              ).trim();
              try {
                const existing = documents.data?.items.find(
                  (item) =>
                    item.id === selected &&
                    item.courseId === courseId &&
                    !item.recordingId,
                );
                if (selected && !existing)
                  throw new Error(
                    'Choose a current document without an audio recording.',
                  );
                setTarget(existing ?? (await createDocument(title, courseId)));
              } catch (cause) {
                setError(documentError(cause));
                documents.reload();
              } finally {
                setPending(false);
                preparing.current = false;
              }
            }}
          >
            <fieldset disabled={readOnly || pending || !folders.ready}>
              <label>
                Course folder
                <select
                  value={courseId}
                  required
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    setSelected('');
                    documents.setQuery({
                      page: 1,
                      courseId: event.target.value,
                    });
                  }}
                >
                  <option value="">Choose a course</option>
                  {folders.folders
                    .filter((item) => !item.readOnly)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Save recording to
                <select
                  value={selected}
                  disabled={!ready || documents.loading}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">A new study document</option>
                  {documents.data?.items
                    .filter(
                      (item) => item.courseId === courseId && !item.recordingId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                </select>
              </label>
              {!selected ? (
                <label>
                  Document title
                  <input
                    name="title"
                    required
                    maxLength={100}
                    defaultValue="Lecture recording"
                  />
                </label>
              ) : null}
              <button className="primary-button" disabled={!ready}>
                {pending ? 'Preparing recorder…' : 'Open recorder'}{' '}
                <Icon name="arrow" size={17} />
              </button>
            </fieldset>
          </form>
          {documents.error ? (
            <p role="alert">
              {documents.error}{' '}
              <button className="text-link" onClick={documents.reload}>
                Refresh documents
              </button>
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="course-error">
              {error}
            </p>
          ) : null}
          <p className="recording-privacy">
            Your microphone starts only when you press Start recording.
          </p>
        </section>
      )}
    </section>
  );
}
