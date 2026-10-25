'use client';
import { useEffect, useState } from 'react';
import { documentFolders } from '@/api/document-folders';
import type { Course } from '@/libs/types/courses';
export function useDocumentFolders() {
  const [folders, setFolders] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    documentFolders(controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) {
          setFolders(value);
          setError('');
          setReady(true);
        }
      },
      () => {
        if (!controller.signal.aborted)
          setError('Unable to load course folders.');
      },
    );
    return () => controller.abort();
  }, [revision]);
  return { folders, error, ready, retry: () => setRevision((n) => n + 1) };
}
