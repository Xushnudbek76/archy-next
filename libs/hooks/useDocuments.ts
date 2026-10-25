'use client';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/json-client';
import {
  documentError,
  listDocuments,
  type DocumentQuery,
} from '@/api/documents-client';
import type { DocumentPage } from '@/libs/types/documents';

export function useDocuments() {
  const [query, setQuery] = useState<DocumentQuery>({ page: 1 });
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify({ ...query, revision });
  const [result, setResult] = useState<{
    key: string;
    data: DocumentPage | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const value = JSON.parse(key) as DocumentQuery;
    listDocuments(value, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: '' });
      },
      (error) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          value.page > 1
        ) {
          setQuery((old) => ({ ...old, page: 1 }));
          return;
        }
        setResult({ key, data: null, error: documentError(error) });
      },
    );
    return () => controller.abort();
  }, [key]);
  return {
    query,
    setQuery,
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : '',
    loading: result?.key !== key,
    reload: () => setRevision((n) => n + 1),
  };
}
