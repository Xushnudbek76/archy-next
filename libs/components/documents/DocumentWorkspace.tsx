'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { documentError, getDocument } from '@/api/documents-client';
import { useDocumentFolders } from '@/libs/hooks/useDocumentFolders';
import type { Document, DocumentDetail } from '@/libs/types/documents';
import { LectureNotes } from '@/libs/components/recordings/LectureNotes';
import { UploadPdf } from './UploadPdf';
import { PdfMaterial } from './PdfMaterial';
import { AttachRecording } from './AttachRecording';
import { ManageDocument } from './ManageDocument';

export function DocumentWorkspace({ id }: { id: string }) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const folders = useDocumentFolders();
  const router = useRouter();
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
  function refresh(saved?: Document) {
    if (saved?.archivedAt) {
      router.replace('/documents');
      return;
    }
    setRevision((n) => n + 1);
  }
  return (
    <div className="documents-page">
      <Link href="/documents" className="document-back">
        Back to My documents
      </Link>
      {error ? (
        <div role="alert">
          {error}
          <button className="secondary-button" onClick={() => refresh()}>
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
              <p>
                {folders.folders.find(
                  (folder) => folder.id === document.courseId,
                )?.title ?? 'Your private study material'}
              </p>
            </div>
            <ManageDocument
              document={document}
              folders={folders.folders}
              disabled={!folders.ready}
              onSaved={refresh}
            />
          </header>
          {folders.error ? (
            <p role="alert">
              {folders.error}{' '}
              <button onClick={folders.retry}>Retry folders</button>
            </p>
          ) : null}
          <div
            className={`study-materials ${document.recordingId ? 'with-recording' : ''}`}
          >
            <div>
              {document.hasPdf ? (
                <PdfMaterial document={document} />
              ) : (
                <section className="document-material surface">
                  <UploadPdf id={id} onSaved={() => refresh()} />
                </section>
              )}
            </div>
            <div className="study-recording-column">
              {document.recordingId ? (
                <section
                  className="document-material surface"
                  aria-label="Linked lecture recording"
                >
                  <h2>Lecture recording</h2>
                  <audio
                    controls
                    preload="none"
                    src={`/api/recordings/${document.recordingId}/audio`}
                  >
                    Your browser does not support audio playback.
                  </audio>
                  <LectureNotes
                    key={document.recordingId}
                    recordingId={document.recordingId}
                  />
                </section>
              ) : null}
              <section className="document-material surface">
                <AttachRecording
                  key={document.recordingId ?? 'none'}
                  id={id}
                  current={document.recordingId}
                  onSaved={() => refresh()}
                />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
