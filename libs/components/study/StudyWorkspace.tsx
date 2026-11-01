'use client';
import { useStudyReadOnly } from '@/libs/components/study/StudyAccess';
import { useEffect, useRef, useState } from 'react';
import type { DocumentDetail } from '@/libs/types/documents';
import { useProcessing } from '@/libs/hooks/useProcessing';
import { PdfMaterial } from '@/libs/components/documents/PdfMaterial';
import { UploadPdf } from '@/libs/components/documents/UploadPdf';
import { AttachRecording } from '@/libs/components/documents/AttachRecording';
import { BrowserRecorder } from '@/libs/components/recordings/BrowserRecorder';
import { formatTime } from '@/libs/types/study';
import { sourceLabel, type StudySource } from '@/libs/types/study';
import { readSources, studyError } from '@/api/study-client';
import { DocumentNotes } from './DocumentNotes';
import { DocumentTutor } from '@/libs/components/tutor/DocumentTutor';
import { DocumentQuizzes } from '@/libs/components/quizzes/DocumentQuizzes';
import { sourceDestination, sourcesForRevision } from './source-navigation';
import { seekTime, adjacentTab } from './playback';

export function StudyWorkspace({
  document,
  onSaved,
}: {
  document: DocumentDetail;
  onSaved: () => void;
}) {
  const readOnly = useStudyReadOnly();
  const [panel, setPanel] = useState('material');
  const audio = useRef<HTMLAudioElement>(null);
  const [loadedSources, setLoadedSources] = useState<{
    revision: string;
    items: StudySource[];
  } | null>(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceRevision, setSourceRevision] = useState(0);
  const [selectedSource, setSelectedSource] = useState<StudySource | null>(
    null,
  );
  const sourcePreview = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selectedSource) sourcePreview.current?.focus();
  }, [selectedSource]);
  function seek(seconds: number) {
    const player = audio.current;
    if (!player) return;
    const time = seekTime(seconds, player.duration);
    if (time === null) return;
    player.currentTime = time;
    player.focus();
  }
  const { status, transcript, notes, error, retry } = useProcessing(
    document.recordingId ?? '',
    !!document.recordingId,
  );
  const note = notes?.available ? notes.data : null;
  const text = transcript?.available ? transcript.data : null;
  const materialRevision = `${document.id}:${document.updatedAt}:${document.recordingId ?? ''}:${status?.updatedAt ?? ''}`;
  const sources = sourcesForRevision(loadedSources, materialRevision);
  useEffect(() => {
    const abort = new AbortController();
    readSources(document.id, abort.signal).then(
      (value) => {
        if (!abort.signal.aborted) {
          setLoadedSources({ revision: materialRevision, items: value });
          setSourceError('');
        }
      },
      (cause) => {
        if (!abort.signal.aborted) setSourceError(studyError(cause));
      },
    );
    return () => abort.abort();
  }, [document.id, materialRevision, sourceRevision]);
  function showSource(source: StudySource) {
    setSelectedSource({ ...source });
    setPanel(source.kind === 'pdf' ? 'material' : 'transcript');
    const destination = sourceDestination(source, sources);
    if (destination.time !== null) seek(destination.time);
  }
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
          ['tutor', 'AI tutor'],
          ['quizzes', 'Quizzes'],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            tabIndex={panel === id ? 0 : -1}
            aria-selected={panel === id}
            aria-controls={`panel-${id}`}
            onClick={() => setPanel(id!)}
            onKeyDown={(event) => {
              const buttons = Array.from(
                event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ),
              );
              const next = adjacentTab(
                buttons.indexOf(event.currentTarget),
                buttons.length,
                event.key,
              );
              if (next !== null) {
                event.preventDefault();
                buttons[next]?.click();
                buttons[next]?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {sourceError ? (
        <p role="alert">
          {sourceError}{' '}
          <button onClick={() => setSourceRevision((n) => n + 1)}>
            Reload sources
          </button>
        </p>
      ) : null}
      {selectedSource ? (
        <aside
          ref={sourcePreview}
          tabIndex={-1}
          className="study-citation"
          aria-label="Selected source"
        >
          <strong>{sourceLabel(selectedSource)}</strong>
          {!sourceDestination(selectedSource, sources).current ? (
            <p>
              This material has changed. This is the saved excerpt; its original
              location is no longer available.
            </p>
          ) : null}
          <p>{selectedSource.text}</p>
          <button onClick={() => setSelectedSource(null)}>Close source</button>
        </aside>
      ) : null}
      <section
        id="panel-material"
        role="tabpanel"
        aria-labelledby="tab-material"
        hidden={panel !== 'material'}
      >
        {document.hasPdf ? (
          <PdfMaterial
            document={document}
            page={
              selectedSource
                ? (sourceDestination(selectedSource, sources).page ?? undefined)
                : undefined
            }
          />
        ) : (
          <section className="document-material surface">
            {!readOnly ? (
              <UploadPdf id={document.id} onSaved={onSaved} />
            ) : null}
          </section>
        )}
        <section className="document-material surface">
          {!readOnly ? (
            <AttachRecording
              key={document.recordingId ?? 'none'}
              id={document.id}
              current={document.recordingId}
              onSaved={onSaved}
            />
          ) : null}
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
        <DocumentNotes
          key={document.updatedAt}
          id={document.id}
          sources={sources}
          onSource={showSource}
        >
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
        </DocumentNotes>
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
          <div lang={transcript?.available ? transcript.language : undefined}>
            {text.segments.length ? (
              text.segments.map((segment, index) => (
                <div className="transcript-segment" key={index}>
                  <button
                    className="source-link"
                    onClick={() => seek(segment.start)}
                    aria-label={`Seek audio to ${formatTime(segment.start)}`}
                  >
                    {formatTime(segment.start)}
                  </button>
                  <p>{segment.text}</p>
                </div>
              ))
            ) : (
              <p className="document-text">{text.text}</p>
            )}
          </div>
        ) : (
          <p>
            {document.recordingId
              ? 'The transcript will appear after processing finishes.'
              : 'Link a lecture recording to view its transcript.'}
          </p>
        )}
      </section>
      <section
        id="panel-tutor"
        role="tabpanel"
        aria-labelledby="tab-tutor"
        hidden={panel !== 'tutor'}
        className="document-material surface"
      >
        <DocumentTutor documentId={document.id} onSource={showSource} />
      </section>
      <section
        id="panel-quizzes"
        role="tabpanel"
        aria-labelledby="tab-quizzes"
        hidden={panel !== 'quizzes'}
        className="document-material surface"
      >
        <DocumentQuizzes
          key={document.id}
          documentId={document.id}
          sources={sources}
          onSource={showSource}
        />
      </section>
      {!readOnly ? (
        <details className="document-material surface">
          <summary>Record a lecture</summary>
          <BrowserRecorder
            documentId={document.id}
            courseId={document.courseId}
            onSaved={onSaved}
          />
        </details>
      ) : null}
    </section>
  );
}
