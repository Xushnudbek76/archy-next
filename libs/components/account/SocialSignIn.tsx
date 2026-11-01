'use client';
import { useEffect, useState } from 'react';
import { jsonRequest } from '@/api/json-client';
import { useLanguage } from '@/libs/i18n/LanguageProvider';

const endpoints: Record<string, string> = {
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  kakao: 'https://kauth.kakao.com/oauth/authorize',
  apple: 'https://appleid.apple.com/auth/authorize',
};
export function SocialSignIn({ returnTo }: { returnTo: string }) {
  const [providers, setProviders] = useState<string[]>([]);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const { text } = useLanguage();
  useEffect(() => {
    const abort = new AbortController();
    jsonRequest('/api/oauth/providers', undefined, undefined, {
      signal: abort.signal,
    }).then(
      (value) => {
        if (
          !abort.signal.aborted &&
          value &&
          typeof value === 'object' &&
          'items' in value &&
          Array.isArray(value.items)
        )
          setProviders(
            value.items.filter(
              (item): item is string =>
                typeof item === 'string' && Object.hasOwn(endpoints, item),
            ),
          );
      },
      () => {},
    );
    return () => abort.abort();
  }, []);
  async function start(provider: string) {
    if (pending) return;
    setPending(provider);
    setError('');
    try {
      const value = await jsonRequest(`/api/oauth/${provider}/start`, {
        returnTo,
      });
      if (
        !value ||
        typeof value !== 'object' ||
        !('url' in value) ||
        typeof value.url !== 'string'
      )
        throw new Error('Invalid response');
      const url = new URL(value.url);
      if (
        url.origin + url.pathname !== endpoints[provider] ||
        url.username ||
        url.password
      )
        throw new Error('Invalid provider');
      window.location.assign(url.href);
    } catch {
      setError('Unable to start sign-in. Please try again.');
      setPending('');
    }
  }
  if (!providers.length) return null;
  return (
    <div className="social-signin">
      <div className="auth-divider">or</div>
      {providers.map((provider) => (
        <button
          className={`social-button social-${provider}`}
          key={provider}
          disabled={!!pending}
          onClick={() => void start(provider)}
        >
          {pending === provider
            ? 'Opening…'
            : text(
                `Continue with ${provider === 'google' ? 'Google' : provider === 'kakao' ? 'Kakao' : 'Apple'}`,
              )}
        </button>
      ))}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
