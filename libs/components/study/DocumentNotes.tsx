'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { studyNotes, studyError } from '@/api/study-client';
import type {
  StudyLanguage,
  StudyNotes,
  StudySource,
} from '@/libs/types/study';
import { SourceLinks } from './SourceLinks';
export function DocumentNotes({
  id,
  sources,
  onSource,
  children,
}: {
  id: string;
  sources: StudySource[];
  onSource: (source: StudySource) => void;
  children: ReactNode;
}) {
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [language, setLanguage] = useState<StudyLanguage>('en');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const read = new AbortController();
    studyNotes(id, undefined, read.signal).then(
      (value) => {
        if (!read.signal.aborted) {
          setNotes(value);
          if (value.available) setLanguage(value.language);
        }
      },
      (cause) => {
        if (!read.signal.aborted) setError(studyError(cause));
      },
    );
    return () => {
      read.abort();
      controller.current?.abort();
    };
  }, [id]);
  async function generate() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setPending(true);
    setError('');
    try {
      const value = await studyNotes(id, language, abort.signal);
      if (!abort.signal.aborted) setNotes(value);
    } catch (cause) {
      if (!abort.signal.aborted) setError(studyError(cause));
    } finally {
      controller.current = null;
      if (!abort.signal.aborted) setPending(false);
    }
  }
  return (
    <div>
      <div className="study-controls">
        <label>
          Notes language
          <select
            value={language}
            disabled={pending}
            onChange={(e) => setLanguage(e.target.value as StudyLanguage)}
          >
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <button
          className="primary-button"
          disabled={pending || !sources.length}
          onClick={() => void generate()}
        >
          {pending
            ? 'Preparing notes…'
            : notes?.available
              ? 'Regenerate study notes'
              : 'Generate study notes'}
        </button>
      </div>
      {!sources.length ? (
        <p>
          Add readable material or wait for transcription to generate document
          notes.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {notes?.available ? (
        <section lang={notes.language}>
          <p className="muted">
            {notes.provider === 'fixture' ? 'Synthetic test fixture. ' : ''}
            AI-generated from this document. Check important details against its
            sources.
          </p>
          <h3>Overview</h3>
          <p>{notes.overview}</p>
          {notes.sections.map((section, index) => (
            <section key={index}>
              <h3>{section.title}</h3>
              <p className="document-text">{section.text}</p>
              <SourceLinks
                ids={section.sourceIds}
                sources={sources}
                onSelect={onSource}
              />
            </section>
          ))}
        </section>
      ) : (
        children
      )}
    </div>
  );
}
