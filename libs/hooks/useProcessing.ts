'use client';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/json-client';
import {
  readNotes,
  readProcessing,
  readTranscript,
} from '@/api/processing-client';
import {
  shouldPoll,
  type NoteResult,
  type ProcessingStatus,
  type TranscriptResult,
} from '@/libs/types/processing';
export function useProcessing(id: string, expanded: boolean) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [notes, setNotes] = useState<NoteResult | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!expanded) return;
    let stopped = false;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let delay = 3000;
    let transcriptRead = false,
      notesRead = false;
    const schedule = () => {
      if (!stopped)
        timer = setTimeout(() => {
          void poll();
        }, delay);
    };
    async function poll() {
      if (stopped || finished || document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const state = await readProcessing(id, signal);
        if (stopped || signal.aborted) return;
        setStatus(state);
        setError('');
        const [text, note] = await Promise.all([
          state.transcriptAvailable && !transcriptRead
            ? readTranscript(id, signal)
            : null,
          state.notesAvailable && !notesRead ? readNotes(id, signal) : null,
        ]);
        if (stopped || signal.aborted) return;
        if (text) {
          setTranscript(text);
          transcriptRead = text.available;
        }
        if (note) {
          setNotes(note);
          notesRead = note.available;
        }
        finished = !shouldPoll(state);
        if (!finished) {
          delay = Math.min(state.deferred ? 60000 : 15000, delay * 1.5);
          schedule();
        }
      } catch (cause) {
        if (stopped || signal.aborted) return;
        setError(
          cause instanceof ApiError && [401, 403].includes(cause.status)
            ? 'Sign in again to view lecture notes.'
            : 'Lecture notes are temporarily unavailable.',
        );
        if (!(
          cause instanceof ApiError && [401, 403, 404].includes(cause.status)
        )) {
          delay = Math.min(60000, delay * 2);
          schedule();
        }
      }
    }
    const visibility = () => {
      clearTimeout(timer);
      if (document.hidden) controller?.abort();
      else {
        delay = 3000;
        void poll();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [id, expanded, revision]);
  return {
    status,
    transcript,
    notes,
    error,
    retry: () => setRevision((value) => value + 1),
  };
}
