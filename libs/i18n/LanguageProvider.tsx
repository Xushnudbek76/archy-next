'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { translate, type Language } from './messages';

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  text: (value: string) => string;
}>({
  language: 'en' as Language,
  setLanguage: () => {},
  text: (value: string) => value,
});

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, update] = useState(initialLanguage);
  const setLanguage = useCallback((next: Language) => {
    update(next);
    document.documentElement.lang = next;
    document.cookie = `archy_language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, []);
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        text: (value) => translate(language, value),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
