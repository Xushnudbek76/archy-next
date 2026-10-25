'use client';

import { useEffect, useRef, useState } from 'react';
import { readUploadPolicy } from '@/api/recordings-client';
import {
  BrowserRecordingSession,
  browserCaptureEnvironment,
  recordingTime,
  type CaptureSnapshot,
} from './browser-capture';

export function BrowserRecorder({
  documentId,
  courseId,
  onSaved,
}: {
  documentId: string;
  courseId: string | null;
  onSaved: () => void;
}) {
  // This component captures audio locally; the next action saves it to this document.
  void documentId;
  void courseId;
  void onSaved;
  const session = useRef<BrowserRecordingSession | null>(null);
  const [capture, setCapture] = useState<CaptureSnapshot>({
    phase: 'idle',
    elapsedMs: 0,
    blob: null,
    error: null,
  });
  const [policy, setPolicy] = useState<number | null>(null);
  const [policyError, setPolicyError] = useState(false);
  const preview = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const current = new BrowserRecordingSession(
      browserCaptureEnvironment(),
      setCapture,
    );
    session.current = current;
    return () => {
      current.dispose();
      session.current = null;
    };
  }, []);
  useEffect(() => {
    let active = true;
    readUploadPolicy()
      .then((value) => {
        if (active) setPolicy(value);
      })
      .catch(() => {
        if (active) setPolicyError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const player = preview.current;
    if (!capture.blob || !player) return;
    const url = URL.createObjectURL(capture.blob);
    player.src = url;
    return () => {
      player.pause();
      player.removeAttribute('src');
      player.load();
      URL.revokeObjectURL(url);
    };
  }, [capture.blob]);

  const active = capture.phase === 'recording' || capture.phase === 'paused';
  return (
    <section className="browser-recorder" aria-label="Record audio">
      <h3>Record audio</h3>
      <p>
        Record a lecture using your microphone.{' '}
        {policy
          ? `Up to ${Math.floor(policy / 60)} minutes of audio; paused time is excluded.`
          : 'Loading recording limit…'}
      </p>
      {policyError ? (
        <p role="alert">
          Unable to load the recording limit. Reload the page to try again.
        </p>
      ) : null}
      {capture.error ? (
        <p role="alert" className="course-error">
          {capture.error}
        </p>
      ) : null}
      <p role="status">
        {capture.phase === 'starting'
          ? 'Waiting for microphone permission…'
          : capture.phase === 'recording'
            ? 'Recording'
            : capture.phase === 'paused'
              ? 'Recording paused'
              : capture.phase === 'stopping'
                ? 'Finishing recording…'
                : capture.phase === 'stopped'
                  ? 'Recording stopped'
                  : 'Ready to record'}{' '}
        · {recordingTime(capture.elapsedMs)}
      </p>
      <div className="browser-recorder-actions">
        {capture.phase === 'idle' || capture.phase === 'stopped' ? (
          <button
            className="course-button"
            disabled={!policy}
            onClick={() => policy && void session.current?.start(policy)}
          >
            {capture.phase === 'stopped' ? 'Record again' : 'Start recording'}
          </button>
        ) : null}
        {capture.phase === 'recording' ? (
          <button
            className="course-button"
            onClick={() => session.current?.pause()}
          >
            Pause recording
          </button>
        ) : null}
        {capture.phase === 'paused' ? (
          <button
            className="course-button"
            onClick={() => session.current?.resume()}
          >
            Resume recording
          </button>
        ) : null}
        {active ? (
          <button
            className="course-button"
            onClick={() => session.current?.stop()}
          >
            Stop recording
          </button>
        ) : null}
      </div>
      {capture.blob ? (
        <audio
          controls
          preload="metadata"
          ref={preview}
          aria-label="Recorded audio preview"
        />
      ) : null}
      {capture.blob ? (
        <p className="course-caption">
          Your audio stays in this browser until it is saved.
        </p>
      ) : null}
    </section>
  );
}
