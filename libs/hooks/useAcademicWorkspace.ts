'use client';
import { useEffect, useRef, useState } from 'react';
import { academicError, readAcademics } from '@/api/academics-client';
import { documentFolders } from '@/api/document-folders';
import type { AcademicOverview } from '@/libs/types/academics';
import type { Course } from '@/libs/types/courses';

export function useAcademicWorkspace() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    data: AcademicOverview | null;
    courses: Course[];
    error: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const writing = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      readAcademics(abort.signal),
      documentFolders(abort.signal),
    ]).then(
      ([data, courses]) => {
        if (!abort.signal.aborted)
          setResult({ revision, data, courses, error: '' });
      },
      (cause) => {
        if (!abort.signal.aborted)
          setResult({
            revision,
            data: null,
            courses: [],
            error: academicError(cause),
          });
      },
    );
    return () => abort.abort();
  }, [revision]);
  async function mutate(operation: () => Promise<unknown>) {
    if (writing.current) return false;
    writing.current = true;
    setPending(true);
    setError('');
    try {
      await operation();
      setRevision((n) => n + 1);
      return true;
    } catch (cause) {
      setError(academicError(cause));
      return false;
    } finally {
      writing.current = false;
      setPending(false);
    }
  }
  const current = result?.revision === revision ? result : null;
  return {
    data: current?.data ?? null,
    courses: current?.courses ?? [],
    loading: !current,
    loadError: current?.error ?? '',
    error,
    pending,
    mutate,
    refresh: () => setRevision((n) => n + 1),
  };
}
