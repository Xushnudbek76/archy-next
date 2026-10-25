'use client';

import Link from 'next/link';
import { ApiError } from '@/api/json-client';
import { useEffect, useRef, useState } from 'react';
import {
  BrowserRecordingSave,
  recordedAudioFile,
  type RecordingSaveProgress,
} from '@/api/browser-recording';
import { readUploadPolicy, recordingError } from '@/api/recordings-client';
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
  const saver = useRef<BrowserRecordingSave | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [title, setTitle] = useState('Lecture recording');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [metadataLocked, setMetadataLocked] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveProgress, setSaveProgress] =
    useState<RecordingSaveProgress | null>(null);

  useEffect(() => {
    const current = new BrowserRecordingSession(
      browserCaptureEnvironment(),
      setCapture,
    );
    session.current = current;
    return () => {
      controller.current?.abort();
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

  async function save() {
    if (!capture.blob || !courseId || controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setSaving(true);
    setSaveError('');
    try {
      saver.current ??= new BrowserRecordingSave(
        recordedAudioFile(capture.blob),
        documentId,
        courseId,
        title,
      );
      setMetadataLocked(true);
      await saver.current.save(abort.signal, setSaveProgress);
      if (!abort.signal.aborted) {
        setSaved(true);
        onSaved();
      }
    } catch (cause) {
      if (!abort.signal.aborted)
        setSaveError(
          cause instanceof Error && !(cause instanceof ApiError)
            ? cause.message
            : recordingError(cause),
        );
    } finally {
      controller.current = null;
      setSaving(false);
    }
  }

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
      {!courseId ? (
        <p>
          Choose a course in Manage document before recording.{' '}
          <Link href="/courses" className="text-link">
            Add or manage courses
          </Link>
          .
        </p>
      ) : null}
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
            disabled={!policy || !courseId || saving}
            onClick={() => {
              if (!policy) return;
              saver.current = null;
              setSaved(false);
              setMetadataLocked(false);
              setSaveError('');
              setSaveProgress(null);
              void session.current?.start(policy);
            }}
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
        <div>
          <p className="course-caption">
            Your audio stays in this browser until it is saved.
          </p>
          <label>
            Recording title
            <input
              value={title}
              maxLength={100}
              disabled={saving || metadataLocked || saved}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button
            className="course-button course-primary"
            disabled={saving || saved || !courseId || !title.trim()}
            onClick={() => void save()}
          >
            {saving
              ? 'Saving recording…'
              : saved
                ? 'Recording saved'
                : saveError
                  ? 'Retry saving recording'
                  : 'Save to document'}
          </button>
          {saveProgress && !saved ? (
            <div role="status">
              <p>
                {saveProgress.phase === 'checking'
                  ? 'Checking audio'
                  : saveProgress.phase === 'verifying'
                    ? 'Verifying audio'
                    : saveProgress.phase === 'attaching'
                      ? 'Linking audio to document'
                      : 'Uploading audio'}
              </p>
              <progress
                aria-label="Recording save progress"
                max={saveProgress.total}
                value={saveProgress.bytes}
              />
            </div>
          ) : null}
          {saveError ? (
            <p role="alert" className="course-error">
              {saveError} Your captured audio is kept here so you can retry.
            </p>
          ) : null}
          {saved ? (
            <p role="status">Recording saved to this document.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
