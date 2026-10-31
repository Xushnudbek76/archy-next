'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRequest } from '@/api/auth-client';
import { isUser } from '@/libs/types/auth';

export function DemoEntry() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function enter() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const user = await authRequest('/api/auth/demo', {});
      if (!isUser(user) || !user.isDemo)
        throw new Error('Invalid demo account');
      router.replace('/documents');
      router.refresh();
    } catch {
      setError(
        'The demo could not open. If you are already signed in, return to your workspace. Otherwise, try again.',
      );
      setPending(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="primary-button"
        disabled={pending}
        onClick={() => void enter()}
      >
        {pending ? 'Opening demo…' : 'Open sample workspace'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
