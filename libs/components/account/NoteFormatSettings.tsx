'use client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  readNoteFormats,
  saveNoteFormat,
  removeNoteFormat,
  saveProfile,
  preferenceError,
} from '@/api/preferences-client';
import { usePreferences } from '@/libs/preferences/PreferencesProvider';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import { useDemo } from '@/libs/hooks/useDemo';
import { useAuth } from '@/libs/hooks/useAuth';
import type { NoteFormat } from '@/libs/types/preferences';

export function NoteFormatSettings() {
  const { user } = useAuth();
  const preferences = usePreferences();
  const { text } = useLanguage();
  const demo = useDemo();
  const [formats, setFormats] = useState<NoteFormat[]>([]);
  const [revision, reload] = useState(0);
  const [editing, setEditing] = useState<NoteFormat | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    readNoteFormats(abort.signal).then(
      (items) => {
        if (!abort.signal.aborted) setFormats(items);
      },
      (cause) => {
        if (!abort.signal.aborted) setError(preferenceError(cause));
      },
    );
    return () => abort.abort();
  }, [revision]);
  async function act(action: () => Promise<unknown>) {
    if (pending || demo) return;
    setPending(true);
    setError('');
    setSaved(false);
    try {
      await action();
      reload((value) => value + 1);
      setSaved(true);
    } catch (cause) {
      setError(preferenceError(cause));
    } finally {
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    await act(async () => {
      await saveNoteFormat(
        {
          name: String(fields.get('name') ?? ''),
          instructions: String(fields.get('instructions') ?? ''),
        },
        user.id,
        editing?.id,
      );
      setEditing(null);
      form.reset();
    });
  }
  return (
    <>
      <p className="muted">
        Your selected format is saved with new processing jobs. Completed notes
        stay unchanged.
      </p>
      <div className="format-options">
        {formats.map((format) => (
          <section className="format-option" key={format.id}>
            <label>
              <input
                type="radio"
                name="noteFormat"
                checked={preferences?.profile?.noteFormat === format.id}
                disabled={pending || demo}
                onChange={() =>
                  void act(async () =>
                    preferences!.accept(
                      await saveProfile({ noteFormat: format.id }, user.id),
                    ),
                  )
                }
              />
              <span>
                <strong>{format.name}</strong>
                <small>{format.description}</small>
              </span>
            </label>
            {format.custom ? (
              <div className="format-actions">
                <button
                  className="text-link"
                  disabled={pending || demo}
                  onClick={() => setEditing(format)}
                >
                  {text('Edit')}
                </button>
                <button
                  className="danger-link"
                  disabled={pending || demo}
                  onClick={() =>
                    void act(async () => {
                      await removeNoteFormat(format.id, user.id);
                      preferences?.refresh();
                      if (editing?.id === format.id) setEditing(null);
                    })
                  }
                >
                  {text('Remove')}
                </button>
              </div>
            ) : null}
          </section>
        ))}
      </div>
      <form
        className="settings-form"
        key={editing?.id ?? 'new'}
        onSubmit={(event) => void submit(event)}
      >
        <h2>{text('Custom format')}</h2>
        <fieldset disabled={pending || demo}>
          <label>
            {text('Name')}
            <input
              name="name"
              required
              maxLength={60}
              defaultValue={editing?.name}
            />
          </label>
          <label>
            {text('Instructions')}
            <textarea
              name="instructions"
              required
              maxLength={300}
              rows={4}
              defaultValue={editing?.instructions}
              placeholder="Organize each topic as a question, explanation, and example."
            />
          </label>
          <div className="settings-actions">
            <button className="primary-button">
              {text(
                pending
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Create format',
              )}
            </button>
            {editing ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => setEditing(null)}
              >
                {text('Cancel')}
              </button>
            ) : null}
          </div>
        </fieldset>
      </form>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="text-link"
            onClick={() => reload((value) => value + 1)}
          >
            {text('Retry')}
          </button>
        </p>
      ) : null}
      {saved ? <p role="status">{text('Saved')}</p> : null}
    </>
  );
}
