'use client';

import Link from 'next/link';
import { useState } from 'react';
import { confirmEmail } from '@/libs/auth';
import { useAuthForm } from '@/libs/hooks/useAuthForm';
import { usePrivateLink } from '@/libs/hooks/usePrivateLink';
import { AuthSuccess, FormError } from './AuthFeedback';

export function ConfirmEmailForm({ token }: { token: string }) {
  usePrivateLink('/confirm-email');
  const [confirmed, setConfirmed] = useState(false);
  const form = useAuthForm((error) =>
    error.status === 400
      ? 'This confirmation link has expired or has already been used. Create your account again to request a new link.'
      : error.message,
  );
  if (confirmed)
    return (
      <AuthSuccess title="Email confirmed">
        Your account is ready. Sign in to open your workspace.
      </AuthSuccess>
    );
  return (
    <>
      <h1>Confirm your email.</h1>
      <p className="account-intro">
        {token
          ? 'One small step before you start. Confirm this email address to activate your account.'
          : 'This confirmation link is missing or invalid.'}
      </p>
      {token ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.submit(async () => {
              await confirmEmail(token);
              setConfirmed(true);
            });
          }}
        >
          <FormError message={form.error} />
          <button
            className="account-button"
            disabled={form.pending}
            type="submit"
          >
            {form.pending ? 'Confirming…' : 'Confirm my email'}
          </button>
        </form>
      ) : null}
      <Link className="account-text-link" href="/signup">
        Create account
      </Link>
    </>
  );
}
