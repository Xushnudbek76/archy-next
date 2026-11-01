'use client';

import Link from 'next/link';
import {
  installRecordingLeaveGuard,
  recordingLeaveEnvironment,
} from './recording-leave-guard';
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
  initialTitle = 'Lecture recording',
}: {
  documentId: string;
  courseId: string | null;
  onSaved: () => void;
  initialTitle?: string;
}) {
  const mounted = useRef(false);
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
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [metadataLocked, setMetadataLocked] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveProgress, setSaveProgress] =
    useState<RecordingSaveProgress | null>(null);

  useEffect(() => {
    mounted.current = true;
    const current = new BrowserRecordingSession(
      browserCaptureEnvironment(),
      setCapture,
    );
    session.current = current;
    return () => {
      mounted.current = false;
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
      await saver.current.save(abort.signal, (progress) => {
        if (mounted.current && !abort.signal.aborted) setSaveProgress(progress);
      });
      if (mounted.current && !abort.signal.aborted) {
        setSaved(true);
        onSaved();
      }
    } catch (cause) {
      if (mounted.current && !abort.signal.aborted)
        setSaveError(
          cause instanceof Error && !(cause instanceof ApiError)
            ? cause.message
            : recordingError(cause),
        );
    } finally {
      controller.current = null;
      if (mounted.current) setSaving(false);
    }
  }

  const active = capture.phase === 'recording' || capture.phase === 'paused';
  const dirty =
    active ||
    capture.phase === 'starting' ||
    capture.phase === 'stopping' ||
    (!!capture.blob && !saved);
  useEffect(() => {
    if (!dirty) return;
    return installRecordingLeaveGuard(recordingLeaveEnvironment());
  }, [dirty]);

  function discard() {
    if (
      dirty &&
      !window.confirm('Discard this recording? Unsaved audio will be lost.')
    )
      return false;
    session.current?.discard();
    saver.current = null;
    setSaved(false);
    setMetadataLocked(false);
    setSaveError('');
    setSaveProgress(null);
    return true;
  }

  function start() {
    if (!policy || !discard()) return;
    void session.current?.start(policy);
  }

  function download() {
    const url = preview.current?.src;
    if (!url || !capture.blob) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = recordedAudioFile(capture.blob).name;
    link.click();
  }
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
            onClick={start}
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
        {(dirty || capture.blob) && !saving ? (
          <button className="course-button" onClick={() => discard()}>
            Discard recording
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
            Keep this page open until your audio is saved. You can download a
            copy before leaving.
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
          <button className="course-button" onClick={download}>
            Download audio
          </button>
          {saving && saveProgress?.phase !== 'attaching' ? (
            <button
              className="course-button"
              onClick={() => {
                controller.current?.abort();
                setSaveError(
                  'Saving paused. Retry to continue from saved upload progress.',
                );
              }}
            >
              Pause saving
            </button>
          ) : null}
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
