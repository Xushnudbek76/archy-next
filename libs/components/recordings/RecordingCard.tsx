'use client';
import { useRef, useState } from 'react';
import { LectureNotes } from './LectureNotes';
import type { Recording } from '@/libs/types/recordings';
export function fileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
function duration(seconds: number | null) {
  if (seconds === null) return 'Audio recording';
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m ${Math.floor(seconds % 60)}s`;
}
export function RecordingCard({ recording }: { recording: Recording }) {
  const [error, setError] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  return (
    <article
      className="course-card recording-card"
      aria-label={recording.title}
    >
      <p className="course-caption">{recording.courseTitle}</p>
      <h2>{recording.title}</h2>
      <p className="course-caption">
        {duration(recording.durationSeconds)} · {fileSize(recording.sizeBytes)}
      </p>
      <audio
        ref={player}
        controls
        preload="none"
        aria-label={`Play ${recording.title}`}
        src={`/api/recordings/${recording.id}/audio`}
        onError={() => setError(true)}
        onCanPlay={() => setError(false)}
      />
      {error ? (
        <p role="alert">
          Playback is unavailable. Try again or use a browser that supports this
          audio format.{' '}
          <button
            className="course-button"
            onClick={() => {
              setError(false);
              player.current?.load();
            }}
          >
            Retry playback
          </button>
        </p>
      ) : null}
      <LectureNotes recordingId={recording.id} />
    </article>
  );
}
