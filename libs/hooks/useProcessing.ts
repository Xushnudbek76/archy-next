'use client';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/json-client';
import {
  readNotes,
  readProcessing,
  readTranscript,
} from '@/api/processing-client';
import { shouldPoll } from '@/libs/types/processing';
import { processingState } from './processing-state';
export function useProcessing(id: string, expanded: boolean) {
  const [data, setData] = useState(() => processingState(id));
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
        setData((previous) =>
          processingState(id, previous, { status: state, error: '' }),
        );
        const [text, note] = await Promise.all([
          state.transcriptAvailable && !transcriptRead
            ? readTranscript(id, signal)
            : null,
          state.notesAvailable && !notesRead ? readNotes(id, signal) : null,
        ]);
        if (stopped || signal.aborted) return;
        if (text) {
          setData((previous) =>
            processingState(id, previous, { transcript: text }),
          );
          transcriptRead = text.available;
        }
        if (note) {
          setData((previous) => processingState(id, previous, { notes: note }));
          notesRead = note.available;
        }
        finished = !shouldPoll(state);
        if (!finished) {
          delay = Math.min(state.deferred ? 60000 : 15000, delay * 1.5);
          schedule();
        }
      } catch (cause) {
        if (stopped || signal.aborted) return;
        const message =
          cause instanceof ApiError && [401, 403].includes(cause.status)
            ? 'Sign in again to view lecture notes.'
            : 'Lecture notes are temporarily unavailable.';
        setData((previous) =>
          processingState(id, previous, { error: message }),
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
    ...processingState(id, data),
    retry: () => setRevision((value) => value + 1),
  };
}
