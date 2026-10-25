'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDocument, documentError } from '@/api/documents-client';
import { useDocuments } from '@/libs/hooks/useDocuments';
import { DocumentCard } from './DocumentCard';
import { DocumentControls } from './DocumentControls';
import { ManageDocument } from './ManageDocument';
import { useDocumentFolders } from '@/libs/hooks/useDocumentFolders';
import { Icon } from '@/libs/components/common/Icon';

export function DocumentsWorkspace() {
  const documents = useDocuments();
  const folders = useDocumentFolders();
  const { setQuery } = documents;
  const changeFilter = useCallback(
    (filter: { q: string; courseId: string }) =>
      setQuery({ page: 1, ...filter }),
    [setQuery],
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const document = await createDocument(title.trim());
      router.push(`/documents/${document.id}`);
    } catch (cause) {
      setError(documentError(cause));
      setPending(false);
    }
  }
  return (
    <div className="documents-page">
      <header className="documents-heading">
        <div>
          <h1>My documents</h1>
          <p>All your class materials, in one place.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => dialog.current?.showModal()}
        >
          New document
        </button>
      </header>
      <section className="documents-welcome">
        <h2>Turn class materials into a clearer place to study.</h2>
        <p>
          Start with a lecture PDF or recording, then keep the materials
          together in your course folder.
        </p>
      </section>
      <DocumentControls
        folders={folders.folders}
        query={documents.query}
        onChange={changeFilter}
      />
      {folders.error ? (
        <p role="alert">
          {folders.error} <button onClick={folders.retry}>Retry folders</button>
        </p>
      ) : null}
      {documents.loading ? (
        <p role="status">Loading your documents…</p>
      ) : documents.error ? (
        <div className="documents-error" role="alert">
          {documents.error}
          <button className="secondary-button" onClick={documents.reload}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="documents-count">
            {documents.data?.total ?? 0} documents
          </div>
          <div className="documents-grid">
            <button
              className="add-document-card"
              onClick={() => dialog.current?.showModal()}
            >
              <Icon name="book" size={28} />
              <span>Add a document</span>
            </button>
            {documents.data?.items.map((document) => (
              <div key={document.id}>
                <DocumentCard document={document} />
                <ManageDocument
                  document={document}
                  folders={folders.folders}
                  disabled={!folders.ready}
                  onSaved={documents.reload}
                />
              </div>
            ))}
          </div>
          {documents.data?.total === 0 ? (
            <p className="documents-empty">
              {documents.query.q || documents.query.courseId
                ? 'No documents match these filters. Try another search or course.'
                : 'Your next lecture starts here. Add a document or upload a recording to get started.'}
            </p>
          ) : null}
          <div className="document-pagination">
            <button
              className="secondary-button"
              disabled={documents.query.page === 1}
              onClick={() =>
                documents.setQuery((q) => ({ ...q, page: q.page - 1 }))
              }
            >
              Previous
            </button>
            <span>Page {documents.query.page}</span>
            <button
              className="secondary-button"
              disabled={!documents.data?.nextPage}
              onClick={() =>
                documents.setQuery((q) => ({ ...q, page: q.page + 1 }))
              }
            >
              Next
            </button>
          </div>
        </>
      )}
      <dialog
        ref={dialog}
        className="document-dialog"
        aria-labelledby="new-document-title"
      >
        <form onSubmit={create}>
          <h2 id="new-document-title">New document</h2>
          <label htmlFor="document-title">Document title</label>
          <input
            id="document-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            autoFocus
          />
          {error ? <p role="alert">{error}</p> : null}
          <div className="document-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => dialog.current?.close()}
              disabled={pending}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={pending}>
              {pending ? 'Creating…' : 'Create document'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
