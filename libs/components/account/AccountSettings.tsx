'use client';

import Link from 'next/link';
import { useAuth } from '@/libs/hooks/useAuth';

export function AccountSettings() {
  const { user, pending, signOut } = useAuth();
  return (
    <section className="profile-card">
      <p className="account-eyebrow">YOUR WORKSPACE</p>
      <h1>Your account</h1>
      <p className="account-intro">
        Manage access to your private learning workspace.
      </p>
      <div className="profile-identity">
        <span className="profile-avatar" aria-hidden="true">
          {Array.from(user.displayName || user.email)[0]?.toUpperCase()}
        </span>
        <div>
          <strong>{user.displayName || 'Archy learner'}</strong>
          <p className="muted">{user.email}</p>
        </div>
      </div>
      <dl>
        <div>
          <dt>Name</dt>
          <dd>{user.displayName || 'Not provided'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
      <div className="profile-security">
        <h2>Account security</h2>
        <p className="muted">
          Request an email link when you need to reset your password.
        </p>
        <Link href="/forgot-password" className="secondary-button">
          Reset password
        </Link>
        <button
          type="button"
          className="secondary-button"
          disabled={pending}
          onClick={() => void signOut()}
        >
          {pending ? 'Signing out…' : 'Sign out of Archy'}
        </button>
      </div>
    </section>
  );
}
