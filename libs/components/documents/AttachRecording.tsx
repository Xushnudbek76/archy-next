'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listRecordings } from '@/api/recordings-client';
import { documentError, updateDocument } from '@/api/documents-client';
import type { Recording } from '@/libs/types/recordings';
export function AttachRecording({
  id,
  current,
  onSaved,
}: {
  id: string;
  current: string | null;
  onSaved: () => void;
}) {
  const [choices, setChoices] = useState<Recording[]>([]);
  const [page, setPage] = useState(1);
  const [next, setNext] = useState<number | null>(null);
  const [selection, setSelection] = useState(current ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listRecordings(page, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) {
          setChoices((old) => [
            ...old.filter((item) => !value.items.some((v) => v.id === item.id)),
            ...value.items,
          ]);
          setNext(value.nextPage);
          setLoaded(page);
          setError('');
        }
      },
      () => {
        if (!controller.signal.aborted)
          setError(
            'Unable to load recordings. Try opening the recordings page.',
          );
      },
    );
    return () => controller.abort();
  }, [page]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await updateDocument(id, { recordingId: selection || null });
      onSaved();
    } catch (cause) {
      setError(documentError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="attach-recording">
      <summary>
        {current ? 'Change linked recording' : 'Link a lecture recording'}
      </summary>
      <p>Keep the lecture audio and its slides in the same document.</p>
      <form onSubmit={save}>
        <label htmlFor={`recording-${id}`}>Saved recording</label>
        <select
          id={`recording-${id}`}
          value={selection}
          disabled={pending || loaded !== page}
          onChange={(e) => setSelection(e.target.value)}
        >
          <option value="">No recording</option>
          {current && !choices.some((choice) => choice.id === current) ? (
            <option value={current}>Current recording</option>
          ) : null}
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.title} · {choice.courseTitle}
            </option>
          ))}
        </select>
        {next ? (
          <button
            type="button"
            className="document-manage"
            disabled={pending || loaded !== page}
            onClick={() => setPage(next)}
          >
            Load more recordings
          </button>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="document-actions">
          <Link href="/recordings" className="secondary-button">
            Upload a recording
          </Link>
          <button
            className="primary-button"
            disabled={
              pending || loaded !== page || selection === (current ?? '')
            }
          >
            {pending ? 'Saving…' : 'Save recording'}
          </button>
        </div>
      </form>
    </details>
  );
}
