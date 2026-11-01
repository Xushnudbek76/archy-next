'use client';
import { useDemo } from '@/libs/hooks/useDemo';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { documentError, getDocument } from '@/api/documents-client';
import { useDocumentFolders } from '@/libs/hooks/useDocumentFolders';
import type { Document, DocumentDetail } from '@/libs/types/documents';
import { StudyWorkspace } from '@/libs/components/study/StudyWorkspace';
import { StudyAccessProvider } from '@/libs/components/study/StudyAccess';
import { ManageDocument } from './ManageDocument';

export function DocumentWorkspace({ id }: { id: string }) {
  const readOnly = useDemo();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const folders = useDocumentFolders();
  const archivedSemester =
    !!document?.courseId &&
    folders.ready &&
    (!folders.folders.some((folder) => folder.id === document.courseId) ||
      !!folders.folders.find((folder) => folder.id === document.courseId)
        ?.readOnly);
  const locked = readOnly || !folders.ready || archivedSemester;
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
      ) : null}
      {!document || document.id !== id ? (
        !error ? (
          <p role="status">Opening your document…</p>
        ) : null
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
              disabled={locked}
              onSaved={refresh}
            />
          </header>
          {folders.error ? (
            <p role="alert">
              {folders.error}{' '}
              <button onClick={folders.retry}>Retry folders</button>
            </p>
          ) : null}
          {archivedSemester ? (
            <p className="muted">
              This course or semester is archived. Your materials and saved
              study results remain available to read.
            </p>
          ) : null}
          <StudyAccessProvider readOnly={locked}>
            <StudyWorkspace
              key={id}
              document={document}
              onSaved={() => refresh()}
            />
          </StudyAccessProvider>
        </>
      )}
    </div>
  );
}
