'use client';
import { useState } from 'react';
import { useDocumentFolders } from '@/libs/hooks/useDocumentFolders';

export function RecordingFilters({
  query,
  onChange,
}: {
  query: { q: string; courseId: string };
  onChange: (q: string, courseId: string) => void;
}) {
  const [search, setSearch] = useState(query.q);
  const folders = useDocumentFolders();
  return (
    <form
      className="recording-filters"
      aria-label="Filter recordings"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(search.trim(), query.courseId);
      }}
    >
      <label>
        <span>Search recordings</span>
        <input
          type="search"
          maxLength={100}
          placeholder="Search lecture titles"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label>
        <span>Course folder</span>
        <select
          value={query.courseId}
          onChange={(event) => onChange(search.trim(), event.target.value)}
        >
          <option value="">All courses</option>
          {folders.folders.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </label>
      <button className="secondary-button">Search</button>
      {folders.error ? (
        <p role="alert">
          {folders.error}{' '}
          <button type="button" className="text-link" onClick={folders.retry}>
            Retry folders
          </button>
        </p>
      ) : null}
    </form>
  );
}
