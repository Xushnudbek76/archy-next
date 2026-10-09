'use client';

import Link from 'next/link';
import { useState } from 'react';
import { resetPassword } from '@/libs/auth';
import { useAuthForm } from '@/libs/hooks/useAuthForm';
import { usePrivateLink } from '@/libs/hooks/usePrivateLink';
import { PasswordField } from './AuthFields';
import { AuthSuccess, FormError } from './AuthFeedback';

export function ResetPasswordForm({
  uid,
  token,
}: {
  uid: string;
  token: string;
}) {
  usePrivateLink('/reset-password');
  const [updated, setUpdated] = useState(false);
  const form = useAuthForm((error) =>
    error.status === 400
      ? 'This link may have expired or been used. Use a unique password with at least 10 characters, or request a new link.'
      : error.message,
  );
  if (updated)
    return (
      <AuthSuccess title="Password updated">
        Sign in with your new password. Your previous sessions have been closed.
      </AuthSuccess>
    );
  const valid = Boolean(uid && token);
  return (
    <>
      <h1>Choose a new password.</h1>
      <p className="account-intro">
        {valid
          ? 'Use a unique passphrase to keep your learning safe.'
          : 'This reset link is missing or invalid.'}
      </p>
      {valid ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const password = String(data.get('password'));
            const passwordConfirmation = String(
              data.get('passwordConfirmation'),
            );
            if (password !== passwordConfirmation) {
              form.setError('Passwords do not match.');
              return;
            }
            void form.submit(async () => {
              await resetPassword({
                uid,
                token,
                password,
                passwordConfirmation,
              });
              setUpdated(true);
            });
          }}
        >
          <fieldset disabled={form.pending}>
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              hint="At least 10 characters. Avoid common passwords or your email."
            />
            <PasswordField
              label="Confirm password"
              name="passwordConfirmation"
              autoComplete="new-password"
              minLength={10}
            />
            <FormError message={form.error} />
            <button className="account-button" type="submit">
              {form.pending ? 'Updating password…' : 'Update password'}
            </button>
          </fieldset>
        </form>
      ) : null}
      <Link className="account-text-link" href="/forgot-password">
        Request a new reset link
      </Link>
    </>
  );
}
