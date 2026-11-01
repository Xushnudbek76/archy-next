'use client';
import { useState, type FormEvent } from 'react';
import { saveProfile, preferenceError } from '@/api/preferences-client';
import { usePreferences } from '@/libs/preferences/PreferencesProvider';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import { useDemo } from '@/libs/hooks/useDemo';
import { useAuth } from '@/libs/hooks/useAuth';
import type { Profile } from '@/libs/types/preferences';

export function LanguageSettings() {
  const { user } = useAuth();
  const preferences = usePreferences();
  const profile = preferences?.profile;
  const { text } = useLanguage();
  const demo = useDemo();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (!profile) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || demo) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setSaved(false);
    try {
      preferences!.accept(
        await saveProfile(
          {
            uiLanguage: fields.get('uiLanguage') as Profile['uiLanguage'],
            summaryLanguage: fields.get(
              'summaryLanguage',
            ) as Profile['summaryLanguage'],
          },
          user.id,
        ),
      );
      setSaved(true);
    } catch (cause) {
      setError(preferenceError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="settings-form" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={pending || demo}>
        <label>
          {text('Interface language')}
          <select name="uiLanguage" defaultValue={profile.uiLanguage}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <label>
          {text('Summary language')}
          <select name="summaryLanguage" defaultValue={profile.summaryLanguage}>
            <option value="auto">{text('Same as the lecture')}</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <p className="muted">
          {text(
            'Applies to newly generated notes. Existing notes stay unchanged.',
          )}
        </p>
        <button className="primary-button">
          {text(pending ? 'Saving…' : 'Save changes')}
        </button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      {saved ? <p role="status">{text('Saved')}</p> : null}
    </form>
  );
}
