'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { readProfile } from '@/api/preferences-client';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import type { Profile } from '@/libs/types/preferences';

const PreferencesContext = createContext<{
  profile: Profile | null;
  error: boolean;
  refresh: () => void;
  accept: (profile: Profile) => void;
} | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [revision, reload] = useState(0);
  const { setLanguage } = useLanguage();
  const version = useRef(0);
  const active = useRef(true);
  const accept = useCallback(
    (value: Profile) => {
      if (!active.current) return;
      version.current++;
      setProfile(value);
      setError(false);
      setLanguage(value.uiLanguage);
    },
    [setLanguage],
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const current = version.current;
    readProfile(abort.signal).then(
      (value) => {
        if (!abort.signal.aborted && current === version.current) accept(value);
      },
      () => {
        if (!abort.signal.aborted && current === version.current)
          setError(true);
      },
    );
    return () => abort.abort();
  }, [revision, accept]);
  return (
    <PreferencesContext.Provider
      value={{
        profile,
        error,
        refresh: () => reload((value) => value + 1),
        accept,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
