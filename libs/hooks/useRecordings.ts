'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/api/json-client';
import {
  listRecordings,
  listUploads,
  recordingError,
} from '@/api/recordings-client';
import type { Page, Recording, Upload } from '@/libs/types/recordings';

export function useRecordings() {
  const [query, setQuery] = useState({ page: 1, uploadPage: 1, revision: 0 });
  const [recordings, setRecordings] = useState<Page<Recording> | null>(null);
  const [uploads, setUploads] = useState<Page<Upload> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listRecordings(query.page),
      listUploads(query.uploadPage),
    ]).then(
      ([saved, pending]) => {
        if (!cancelled) {
          setRecordings(saved);
          setUploads(pending);
          setError('');
          setLoading(false);
        }
      },
      (cause) => {
        if (cancelled) return;
        if (
          cause instanceof ApiError &&
          cause.status === 404 &&
          (query.page > 1 || query.uploadPage > 1)
        ) {
          setQuery((q) => ({ ...q, page: 1, uploadPage: 1 }));
          return;
        }
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
          router.replace('/login?next=%2Frecordings');
          router.refresh();
        }
        setError(recordingError(cause));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [query, router]);
  function refresh(page = query.page, uploadPage = query.uploadPage) {
    setLoading(true);
    setQuery((q) => ({ page, uploadPage, revision: q.revision + 1 }));
  }
  return { recordings, uploads, loading, error, query, refresh };
}
