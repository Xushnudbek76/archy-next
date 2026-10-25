'use client';
import { useRef, useState } from 'react';
import type { DocumentDetail } from '@/libs/types/documents';
import { useProcessing } from '@/libs/hooks/useProcessing';
import { PdfMaterial } from '@/libs/components/documents/PdfMaterial';
import { UploadPdf } from '@/libs/components/documents/UploadPdf';
import { AttachRecording } from '@/libs/components/documents/AttachRecording';
import { BrowserRecorder } from '@/libs/components/recordings/BrowserRecorder';

export function StudyWorkspace({
  document,
  onSaved,
}: {
  document: DocumentDetail;
  onSaved: () => void;
}) {
  const [panel, setPanel] = useState('material');
  const audio = useRef<HTMLAudioElement>(null);
  const { status, transcript, notes, error, retry } = useProcessing(
    document.recordingId ?? '',
    !!document.recordingId,
  );
  const note = notes?.available ? notes.data : null;
  const text = transcript?.available ? transcript.data : null;
  return (
    <section className="study-workspace" aria-label="Study workspace">
      {document.recordingId ? (
        <section className="study-audio surface" aria-label="Lecture audio">
          <h2>Lecture audio</h2>
          <audio
            ref={audio}
            controls
            preload="metadata"
            src={`/api/recordings/${document.recordingId}/audio`}
          >
            Your browser does not support audio playback.
          </audio>
          {status && !['completed', 'unavailable'].includes(status.status) ? (
            <p role="status">
              {status.status === 'failed'
                ? 'Processing could not finish. Your audio is still available.'
                : status.deferred
                  ? 'Processing is waiting for the provider.'
                  : 'Transcript and notes are being prepared.'}
            </p>
          ) : null}
        </section>
      ) : null}
      <div className="study-tabs" role="tablist" aria-label="Study views">
        {[
          ['material', 'Original material'],
          ['notes', 'Summary notes'],
          ['transcript', 'Transcript'],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={panel === id}
            aria-controls={`panel-${id}`}
            onClick={() => setPanel(id!)}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        id="panel-material"
        role="tabpanel"
        aria-labelledby="tab-material"
        hidden={panel !== 'material'}
      >
        {document.hasPdf ? (
          <PdfMaterial document={document} />
        ) : (
          <section className="document-material surface">
            <UploadPdf id={document.id} onSaved={onSaved} />
          </section>
        )}
        <section className="document-material surface">
          <AttachRecording
            key={document.recordingId ?? 'none'}
            id={document.id}
            current={document.recordingId}
            onSaved={onSaved}
          />
        </section>
      </section>
      <section
        id="panel-notes"
        role="tabpanel"
        aria-labelledby="tab-notes"
        hidden={panel !== 'notes'}
        className="document-material surface"
      >
        <h2>Summary notes</h2>
        {error ? (
          <p role="alert">
            {error} <button onClick={retry}>Try again</button>
          </p>
        ) : null}
        {note ? (
          <div lang={notes?.available ? notes.language : undefined}>
            <p className="muted">
              {notes?.available && notes.provider === 'fixture'
                ? 'Synthetic test fixture. '
                : ''}
              AI-generated from the transcript. Check details against the
              original.
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
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <p>
            {document.recordingId
              ? 'Notes will appear after lecture processing finishes.'
              : 'Link a lecture recording to view its notes.'}
          </p>
        )}
      </section>
      <section
        id="panel-transcript"
        role="tabpanel"
        aria-labelledby="tab-transcript"
        hidden={panel !== 'transcript'}
        className="document-material surface"
      >
        <h2>Transcript</h2>
        {text ? (
          <p
            className="document-text"
            lang={transcript?.available ? transcript.language : undefined}
          >
            {text.text}
          </p>
        ) : (
          <p>
            {document.recordingId
              ? 'The transcript will appear after processing finishes.'
              : 'Link a lecture recording to view its transcript.'}
          </p>
        )}
      </section>
      <details className="document-material surface">
        <summary>Record a lecture</summary>
        <BrowserRecorder
          documentId={document.id}
          courseId={document.courseId}
          onSaved={onSaved}
        />
      </details>
    </section>
  );
}
