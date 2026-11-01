'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { closeAccount, preferenceError } from '@/api/preferences-client';
import { useDemo } from '@/libs/hooks/useDemo';
import { useAuth } from '@/libs/hooks/useAuth';
import { useLanguage } from '@/libs/i18n/LanguageProvider';

export function CloseAccount() {
  const { user } = useAuth();
  const demo = useDemo();
  const router = useRouter();
  const { text } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || demo) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const value = await closeAccount(
        String(data.get('password') ?? ''),
        String(data.get('confirmation') ?? ''),
        user.id,
      );
      if (
        !value ||
        typeof value !== 'object' ||
        !('closed' in value) ||
        value.closed !== true
      )
        throw new Error('invalid response');
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(preferenceError(cause));
      setPending(false);
    }
  }
  return (
    <>
      <div className="settings-note">
        <h2>Leave your workspace</h2>
        <p>
          Closing your account removes your courses, documents, conversations,
          and recordings and signs out every session. Private files are queued
          for deletion. Cancel any active plan first.
        </p>
        <p>
          This cannot be undone. If you use social sign-in,{' '}
          <Link className="text-link" href="/forgot-password">
            set a password by email
          </Link>{' '}
          before continuing.
        </p>
      </div>
      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={pending || demo}>
          <label>
            {text('Current password')}
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={128}
            />
          </label>
          <label>
            {text('Type CLOSE to confirm')}
            <input
              name="confirmation"
              required
              pattern="CLOSE"
              autoComplete="off"
            />
          </label>
          <button className="danger-button">
            {pending ? 'Closing account…' : text('Close account')}
          </button>
        </fieldset>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </>
  );
}
