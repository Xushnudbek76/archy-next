'use client';

import { useState } from 'react';
import { AuthError } from '@/api/auth-client';

export function useAuthForm(messageFor?: (error: AuthError) => string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(operation: () => Promise<void>) {
    if (pending) return;
    setError('');
    setPending(true);
    try {
      await operation();
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? (messageFor?.(cause) ?? cause.message)
          : 'Unable to complete your request. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return { pending, error, setError, submit };
}
