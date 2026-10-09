'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logIn } from '@/libs/auth';
import { useAuthForm } from '@/libs/hooks/useAuthForm';
import { Field, PasswordField } from './AuthFields';
import { AccountTabs, FormError } from './AuthFeedback';

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const form = useAuthForm((error) =>
    error.status === 400 || error.status === 403
      ? 'Check your email and password. Confirm your email before signing in.'
      : error.message,
  );
  return (
    <>
      <AccountTabs active="login" next={returnTo} />
      <h1>Welcome back.</h1>
      <p className="account-intro">Pick up where your learning left off.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void form.submit(async () => {
            await logIn({
              email: String(data.get('email')).trim(),
              password: String(data.get('password')),
            });
            router.replace(returnTo);
            router.refresh();
          });
        }}
      >
        <fieldset disabled={form.pending}>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            maxLength={254}
            required
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
          />
          <Link
            className="account-text-link forgot-link"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          <FormError message={form.error} />
          <button className="account-button" type="submit">
            {form.pending ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
      </form>
    </>
  );
}
