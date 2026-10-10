'use client';

import { useState, type FormEvent } from 'react';
import { Field } from '@/libs/components/account/AuthFields';

export function CourseForm({
  initialTitle = '',
  pending,
  onSave,
  onCancel,
}: {
  initialTitle?: string;
  pending: boolean;
  onSave: (title: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const cleaned = title.trim();
    if (!cleaned || [...cleaned].length > 100) {
      setError('Use a title between 1 and 100 characters.');
      return;
    }
    setError('');
    if (await onSave(cleaned)) setTitle('');
  }
  return (
    <form className="course-form" onSubmit={submit}>
      <Field
        label={onCancel ? 'New title' : 'Course title'}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        hint="Use 1–100 characters."
        required
        disabled={pending}
        autoFocus={Boolean(onCancel)}
      />
      {error ? (
        <p role="alert" aria-label="Course error" className="course-error">
          {error}
        </p>
      ) : null}
      <div className="course-actions">
        <button
          className="course-button primary"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Saving…' : onCancel ? 'Save' : 'Add course'}
        </button>
        {onCancel ? (
          <button
            className="course-button"
            type="button"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
