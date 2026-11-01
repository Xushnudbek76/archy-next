'use client';
import Link from 'next/link';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import { usePreferences } from '@/libs/preferences/PreferencesProvider';

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { text } = useLanguage();
  const preferences = usePreferences();
  return (
    <section className="settings-workspace">
      <Link className="text-link" href="/settings">
        {text('Settings')}
      </Link>
      <header className="page-heading">
        <h1>{text(title)}</h1>
      </header>
      {preferences?.profile ? (
        children
      ) : preferences?.error ? (
        <div role="alert">
          <p>Unable to load your preferences.</p>
          <button className="secondary-button" onClick={preferences.refresh}>
            {text('Retry')}
          </button>
        </div>
      ) : (
        <p role="status">Loading preferences…</p>
      )}
    </section>
  );
}
