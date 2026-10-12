'use client';
import { useState } from 'react';
import { useProcessing } from '@/libs/hooks/useProcessing';
const labels = {
  unavailable: 'Notes are unavailable for this recording.',
  queued: 'Waiting to process this lecture.',
  transcribing: 'Transcribing the lecture…',
  summarizing: 'Preparing lecture notes…',
  completed: 'Lecture notes are ready.',
  failed: 'Lecture processing could not finish.',
};
export function LectureNotes({ recordingId }: { recordingId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { status, transcript, notes, error, retry } = useProcessing(
    recordingId,
    expanded,
  );
  const note = notes?.available ? notes.data : null;
  const text = transcript?.available ? transcript.data : null;
  const language = notes?.available
    ? notes.language
    : transcript?.available
      ? transcript.language
      : status?.language;
  return (
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>Transcript and notes</summary>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button className="course-button" onClick={retry}>
            Refresh notes
          </button>
        </p>
      ) : null}
      {!status && !error ? <p role="status">Loading lecture notes…</p> : null}
      {status ? (
        <p role="status">
          {labels[status.status]}{' '}
          {status.deferred
            ? 'Processing is waiting and will resume later.'
            : ''}
        </p>
      ) : null}
      {status?.status === 'failed' ? (
        <p>Your audio and any completed transcript are still available.</p>
      ) : null}
      {note ? (
        <section aria-label="Lecture notes" lang={language ?? undefined}>
          <p className="course-caption">
            {notes?.available && notes.provider === 'fixture'
              ? 'Synthetic test fixture. '
              : ''}
            AI-generated from the transcript. Check important details against
            the lecture.
          </p>
          <h3>Overview</h3>
          <p>{note.overview}</p>
          {(
            [
              ['Key concepts', note.key_concepts],
              ['Examples', note.examples],
              ['Review questions', note.review_questions],
              ['Unclear passages', note.unclear_passages],
            ] as const
          ).map(([title, items]) =>
            items.length ? (
              <section key={title}>
                <h3>{title}</h3>
                <ul>
                  {items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </section>
      ) : null}
      {text ? (
        <section aria-label="Transcript" lang={language ?? undefined}>
          <h3>Transcript</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{text.text}</p>
        </section>
      ) : null}
    </details>
  );
}
