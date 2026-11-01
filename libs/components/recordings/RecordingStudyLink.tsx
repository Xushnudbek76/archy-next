'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { openRecordingStudy, recordingError } from '@/api/recordings-client';
import type { Recording } from '@/libs/types/recordings';
import { useDemo } from '@/libs/hooks/useDemo';
import { Icon } from '@/libs/components/common/Icon';

export function RecordingStudyLink({ recording }: { recording: Recording }) {
  const demo = useDemo();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (recording.documentId)
    return (
      <Link
        className="text-link recording-study-link"
        href={`/documents/${recording.documentId}`}
      >
        Open study workspace <Icon name="arrow" size={16} />
      </Link>
    );
  return (
    <div className="recording-study-link">
      <button
        className="secondary-button"
        disabled={pending || demo}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError('');
          try {
            router.push(`/documents/${await openRecordingStudy(recording.id)}`);
          } catch (cause) {
            setError(recordingError(cause));
            setPending(false);
          }
        }}
      >
        {pending ? 'Opening…' : 'Open study workspace'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
