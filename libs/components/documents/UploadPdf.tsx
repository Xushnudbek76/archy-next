'use client';
import { useEffect, useRef, useState } from 'react';
import { pdfError, uploadPdf } from '@/api/document-pdf-client';
export function UploadPdf({
  id,
  onSaved,
}: {
  id: string;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || pending) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setProgress(0);
    setError('');
    try {
      await uploadPdf(id, file, setProgress, controller.signal);
      onSaved();
    } catch (cause) {
      if (!controller.signal.aborted) setError(pdfError(cause));
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return (
    <form className="pdf-upload" onSubmit={upload}>
      <h2>Add a lecture PDF</h2>
      <p className="muted">
        Up to 20 MB and 200 pages. Choose a PDF with selectable text; scanned
        and password-protected files are not supported yet.
      </p>
      <label htmlFor={`pdf-${id}`}>PDF file</label>
      <input
        id={`pdf-${id}`}
        type="file"
        accept="application/pdf,.pdf"
        disabled={pending}
        required
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError('');
        }}
      />
      {pending ? (
        <div role="status">
          <progress value={progress} max={100} />
          <p>
            {progress === 100
              ? 'Reading your PDF…'
              : `Uploading your PDF… ${progress}%`}
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button type="button" className="document-manage" onClick={onSaved}>
            Refresh document
          </button>
        </p>
      ) : null}
      <button className="primary-button" disabled={!file || pending}>
        {pending ? 'Saving PDF…' : 'Upload PDF'}
      </button>
    </form>
  );
}
