'use client';

import { useAuth } from '@/libs/hooks/useAuth';

export function AccountSettings() {
  const { user } = useAuth();
  return (
    <section className="profile-card">
      <p className="account-eyebrow">MAKE YOURSELF AT HOME</p>
      <h1>Your account</h1>
      <p className="account-intro">
        The account connected to your Archy workspace.
      </p>
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
    </section>
  );
}
