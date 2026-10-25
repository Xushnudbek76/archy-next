'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Course } from '@/libs/types/courses';
export function DocumentControls({
  folders,
  query,
  onChange,
}: {
  folders: Course[];
  query: { q?: string; courseId?: string };
  onChange: (filter: { q: string; courseId: string }) => void;
}) {
  const [search, setSearch] = useState(query.q ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (query.q ?? ''))
        onChange({ q: search, courseId: query.courseId ?? '' });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query.q, query.courseId, onChange]);
  return (
    <div className="document-controls">
      <label>
        <span>Search documents</span>
        <input
          type="search"
          placeholder="Search your documents"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label>
        <span>Course folder</span>
        <select
          value={query.courseId ?? ''}
          onChange={(e) => onChange({ q: search, courseId: e.target.value })}
        >
          <option value="">All courses</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.title}
            </option>
          ))}
        </select>
      </label>
      <Link className="secondary-button" href="/courses">
        Manage courses
      </Link>
    </div>
  );
}
