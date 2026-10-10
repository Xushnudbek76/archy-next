'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/api/json-client';
import { listCourses, courseError } from '@/api/courses-client';
import type { CourseList } from '@/libs/types/courses';

export function useCourses() {
  const [query, setQuery] = useState({ archived: false, page: 1, revision: 0 });
  const [list, setList] = useState<CourseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const writing = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    listCourses(query.archived, query.page).then(
      (value) => {
        if (cancelled) return;
        setList(value);
        setLoadError('');
        setLoading(false);
      },
      (cause) => {
        if (cancelled) return;
        if (
          cause instanceof ApiError &&
          cause.status === 404 &&
          query.page > 1
        ) {
          setQuery((previous) => ({ ...previous, page: 1 }));
          return;
        }
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
          router.replace('/login?next=%2Fcourses');
          router.refresh();
        }
        setLoadError(courseError(cause));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [query, router]);

  function navigate(archived = query.archived, page = query.page) {
    setLoading(true);
    setLoadError('');
    setError('');
    setQuery((previous) => ({
      archived,
      page,
      revision: previous.revision + 1,
    }));
  }

  async function mutate(operation: () => Promise<unknown>): Promise<boolean> {
    if (writing.current) return false;
    writing.current = true;
    setPending(true);
    setError('');
    try {
      await operation();
      navigate(query.archived, 1);
      return true;
    } catch (cause) {
      setError(courseError(cause));
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
        router.replace('/login?next=%2Fcourses');
        router.refresh();
      }
      return false;
    } finally {
      writing.current = false;
      setPending(false);
    }
  }
  return { list, loading, loadError, error, pending, query, navigate, mutate };
}
