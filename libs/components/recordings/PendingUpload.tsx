'use client';
import { useId, useRef, useState } from 'react';
import type { Upload } from '@/libs/types/recordings';
import { fileSize } from './RecordingCard';
export function PendingUpload({
  upload,
  disabled,
  onResume,
  onCancel,
}: {
  upload: Upload;
  disabled: boolean;
  onResume: (upload: Upload, file: File) => Promise<boolean>;
  onCancel: (upload: Upload) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <article className="course-card" aria-label={`Pending ${upload.title}`}>
      <h3>{upload.title}</h3>
      <p className="course-caption">
        {upload.courseTitle} · {fileSize(upload.uploadedBytes)} of{' '}
        {fileSize(upload.sizeBytes)} saved
      </p>
      <p className="course-caption">
        {upload.maxDurationSeconds === null
          ? 'Existing upload: no duration limit.'
          : `Upload limit: ${upload.maxDurationSeconds / 60} minutes.`}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const file = input.current?.files?.[0];
          if (file) await onResume(upload, file);
        }}
      >
        <label htmlFor={id}>Reselect {upload.fileName}</label>
        <input
          id={id}
          ref={input}
          type="file"
          required
          disabled={disabled || pending}
        />
        <div className="course-actions">
          <button
            className="course-button"
            type="submit"
            disabled={disabled || pending}
          >
            Resume upload
          </button>
          <button
            className="course-button"
            type="button"
            disabled={disabled || pending}
            onClick={() => setConfirm(true)}
          >
            Cancel upload
          </button>
        </div>
      </form>
      {confirm ? (
        <div role="group" aria-label="Cancel confirmation">
          <p>Discard this unfinished upload?</p>
          <button
            className="course-button"
            disabled={pending || disabled}
            onClick={async () => {
              setPending(true);
              try {
                await onCancel(upload);
              } finally {
                setPending(false);
                setConfirm(false);
              }
            }}
          >
            Discard upload
          </button>
          <button
            className="course-button"
            disabled={pending || disabled}
            onClick={() => setConfirm(false)}
          >
            Keep upload
          </button>
        </div>
      ) : null}
    </article>
  );
}
