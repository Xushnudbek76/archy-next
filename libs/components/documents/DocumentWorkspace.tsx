'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { documentError, getDocument } from '@/api/documents-client';
import { UploadPdf } from './UploadPdf';
import type { DocumentDetail } from '@/libs/types/documents';
export function DocumentWorkspace({ id }: { id: string }) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getDocument(id, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) {
          setDocument(value);
          setError('');
        }
      },
      (cause) => {
        if (!controller.signal.aborted) setError(documentError(cause));
      },
    );
    return () => controller.abort();
  }, [id, revision]);
  return (
    <div className="documents-page">
      <Link href="/documents" className="document-back">
        Back to My documents
      </Link>
      {error ? (
        <div role="alert">
          {error}
          <button
            className="secondary-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : !document ? (
        <p role="status">Opening your document…</p>
      ) : (
        <>
          <header className="documents-heading">
            <div>
              <h1>{document.title}</h1>
              <p>Your private study material.</p>
            </div>
          </header>
          <section className="document-material surface">
            <h2>Lecture material</h2>
            {document.hasPdf ? (
              <p>
                {document.fileName} · {document.pageCount} pages
              </p>
            ) : (
              <UploadPdf id={id} onSaved={() => setRevision((n) => n + 1)} />
            )}
            <Link href="/recordings" className="primary-button">
              Open recordings
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
