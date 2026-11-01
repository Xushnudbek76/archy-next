'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { saveProfile, preferenceError } from '@/api/preferences-client';
import { usePreferences } from '@/libs/preferences/PreferencesProvider';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import { useDemo } from '@/libs/hooks/useDemo';
import { useAuth } from '@/libs/hooks/useAuth';

export function ProfileForm() {
  const { user } = useAuth();
  const preferences = usePreferences();
  const profile = preferences?.profile;
  const { text } = useLanguage();
  const demo = useDemo();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!profile) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || demo) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setMessage('');
    try {
      preferences!.accept(
        await saveProfile(
          {
            displayName: String(fields.get('displayName') ?? ''),
            university: String(fields.get('university') ?? ''),
            department: String(fields.get('department') ?? ''),
          },
          user.id,
        ),
      );
      setMessage('Saved');
    } catch (cause) {
      setError(preferenceError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={pending || demo}>
          {(['displayName', 'university', 'department'] as const).map((key) => (
            <label key={key}>
              {text(
                key === 'displayName'
                  ? 'Display name'
                  : key === 'university'
                    ? 'University'
                    : 'Department',
              )}
              <input
                name={key}
                defaultValue={profile[key]}
                maxLength={100}
                autoComplete={key === 'displayName' ? 'name' : 'off'}
              />
            </label>
          ))}
          <label>
            {text('Email')}
            <input value={profile.email} readOnly type="email" />
          </label>
          <button className="primary-button">
            {text(pending ? 'Saving…' : 'Save changes')}
          </button>
        </fieldset>
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{text(message)}</p> : null}
      </form>
      <div className="settings-note">
        <h2>Account security</h2>
        <p>Password changes use a verified email link.</p>
        <Link className="text-link" href="/forgot-password">
          {text('Reset password')}
        </Link>
      </div>
    </>
  );
}
