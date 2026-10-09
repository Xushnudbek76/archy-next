'use client';

import Link from 'next/link';
import { useState } from 'react';
import { requestPasswordReset } from '@/libs/auth';
import { useAuthForm } from '@/libs/hooks/useAuthForm';
import { Field } from './AuthFields';
import { AuthSuccess, FormError } from './AuthFeedback';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useAuthForm();
  if (sent)
    return (
      <AuthSuccess title="Check your email">
        If an active account uses that address, you’ll receive a password reset
        link.
      </AuthSuccess>
    );
  return (
    <>
      <Link className="account-text-link" href="/login">
        ← Back to sign in
      </Link>
      <h1>A fresh start.</h1>
      <p className="account-intro">
        Enter your email and we’ll help you reset your password.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void form.submit(async () => {
            await requestPasswordReset(String(data.get('email')).trim());
            setSent(true);
          });
        }}
      >
        <fieldset disabled={form.pending}>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
          <FormError message={form.error} />
          <button className="account-button" type="submit">
            {form.pending ? 'Sending link…' : 'Send reset link'}
          </button>
        </fieldset>
      </form>
    </>
  );
}
