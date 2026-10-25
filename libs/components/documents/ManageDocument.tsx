'use client';
import { useRef, useState } from 'react';
import {
  archiveDocument,
  documentError,
  updateDocument,
} from '@/api/documents-client';
import type { Document } from '@/libs/types/documents';
import type { Course } from '@/libs/types/courses';
export function ManageDocument({
  document,
  folders,
  onSaved,
  disabled = false,
}: {
  document: Document;
  folders: Course[];
  onSaved: (document?: Document) => void;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(document.title);
  const [courseId, setCourseId] = useState(document.courseId ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    const patch: { title?: string; courseId?: string | null } = {};
    if (title.trim() !== document.title) patch.title = title.trim();
    if (courseId !== (document.courseId ?? ''))
      patch.courseId = courseId || null;
    try {
      if (Object.keys(patch).length) await updateDocument(document.id, patch);
      dialog.current?.close();
      onSaved();
    } catch (cause) {
      setError(documentError(cause));
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const archived = await archiveDocument(document.id);
      dialog.current?.close();
      onSaved(archived);
    } catch (cause) {
      setError(documentError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="document-manage"
        disabled={disabled}
        aria-label={`Manage ${document.title}`}
        onClick={() => {
          setTitle(document.title);
          setCourseId(document.courseId ?? '');
          setConfirm(false);
          setError('');
          dialog.current?.showModal();
        }}
      >
        Manage
      </button>
      <dialog
        ref={dialog}
        className="document-dialog"
        aria-label="Manage document"
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        {confirm ? (
          <div>
            <h2>Archive this document?</h2>
            <p>It will leave your library. The original files will be kept.</p>
            {error ? <p role="alert">{error}</p> : null}
            <div className="document-actions">
              <button
                className="secondary-button"
                disabled={pending}
                onClick={() => setConfirm(false)}
              >
                Keep document
              </button>
              <button
                className="primary-button"
                disabled={pending}
                onClick={() => void archive()}
              >
                {pending ? 'Archiving…' : 'Confirm archive'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={save}>
            <h2>Manage document</h2>
            <label htmlFor={`title-${document.id}`}>Document title</label>
            <input
              id={`title-${document.id}`}
              value={title}
              maxLength={100}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor={`folder-${document.id}`}>Course folder</label>
            <select
              id={`folder-${document.id}`}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">No course folder</option>
              {courseId && !folders.some((folder) => folder.id === courseId) ? (
                <option value={courseId}>Current course (archived)</option>
              ) : null}
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title}
                </option>
              ))}
            </select>
            {error ? <p role="alert">{error}</p> : null}
            <div className="document-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={pending}
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={pending}>
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
            <button
              type="button"
              className="document-archive"
              disabled={pending}
              onClick={() => setConfirm(true)}
            >
              Archive document
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
