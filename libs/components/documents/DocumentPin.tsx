'use client';
import { useState } from 'react';
import { documentError, pinDocument } from '@/api/documents-client';
import type { Document } from '@/libs/types/documents';

export function DocumentPin({
  document,
  disabled,
  onSaved,
}: {
  document: Document;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="document-pin">
      <button
        className="text-link"
        disabled={disabled || pending}
        aria-pressed={!!document.isPinned}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError('');
          try {
            await pinDocument(document.id, !document.isPinned);
            onSaved();
          } catch (cause) {
            setError(documentError(cause));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? 'Saving…'
          : document.isPinned
            ? 'Unpin material'
            : 'Pin material'}
      </button>
      {error ? (
        <p className="course-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
