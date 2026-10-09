'use client';

import { useState } from 'react';
import { signUp } from '@/libs/auth';
import { returnPathCookie } from '@/libs/auth/return-path';
import { useAuthForm } from '@/libs/hooks/useAuthForm';
import { Field, PasswordField } from './AuthFields';
import { AccountTabs, AuthSuccess, FormError } from './AuthFeedback';

export function SignupForm({ returnTo }: { returnTo: string }) {
  const [sent, setSent] = useState(false);
  const form = useAuthForm((error) =>
    error.status === 400
      ? 'Check your details. Use a unique password with at least 10 characters; avoid common passwords or your email.'
      : error.message,
  );
  if (sent)
    return (
      <AuthSuccess title="Check your email" returnTo={returnTo}>
        If your address can be registered, you’ll receive a link to confirm it.
        Follow the link, then sign in.
      </AuthSuccess>
    );
  return (
    <>
      <AccountTabs active="signup" next={returnTo} />
      <h1>Make room for learning.</h1>
      <p className="account-intro">Create your Archy account.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const password = String(data.get('password'));
          const passwordConfirmation = String(data.get('passwordConfirmation'));
          if (password !== passwordConfirmation) {
            form.setError('Passwords do not match.');
            return;
          }
          void form.submit(async () => {
            await signUp({
              email: String(data.get('email')).trim(),
              displayName: String(data.get('displayName')).trim(),
              password,
              passwordConfirmation,
            });
            document.cookie = returnPathCookie(
              returnTo,
              window.location.protocol === 'https:',
            );
            setSent(true);
          });
        }}
      >
        <fieldset disabled={form.pending}>
          <Field
            label="Name"
            name="displayName"
            autoComplete="name"
            maxLength={100}
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            hint="At least 10 characters. Use a unique passphrase."
          />
          <PasswordField
            label="Confirm password"
            name="passwordConfirmation"
            autoComplete="new-password"
            minLength={10}
          />
          <FormError message={form.error} />
          <button className="account-button" type="submit">
            {form.pending ? 'Creating account…' : 'Create account'}
          </button>
        </fieldset>
      </form>
    </>
  );
}
