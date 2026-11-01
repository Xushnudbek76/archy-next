import Link from 'next/link';
import { Brand } from '@/libs/components/common/Brand';
import { Icon } from '@/libs/components/common/Icon';
import { useAuth } from '@/libs/hooks/useAuth';
import { useLanguage } from '@/libs/i18n/LanguageProvider';
import { usePreferences } from '@/libs/preferences/PreferencesProvider';
import { activeWorkspacePage, workspacePages } from './navigation';

export function WorkspaceNavigation({
  pathname,
  close,
}: {
  pathname: string;
  close?: () => void;
}) {
  const { user, pending, signOut } = useAuth();
  const { text } = useLanguage();
  const preferences = usePreferences();
  const active = activeWorkspacePage(pathname);
  return (
    <>
      <section className="sidebar-card">
        <Link
          className="brand"
          href="/dashboard"
          aria-label="Archy home"
          onClick={close}
        >
          <Brand />
        </Link>
        <div className="sidebar-profile">
          <h2>
            {preferences?.profile?.displayName ||
              user.displayName ||
              text('Your workspace')}
          </h2>
          <p>{user.email}</p>
        </div>
        <nav aria-label="Main navigation">
          {workspacePages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              onClick={close}
              className={`nav-link ${active.href === page.href ? 'active' : ''}`}
              aria-current={active.href === page.href ? 'page' : undefined}
            >
              <Icon name={page.icon} size={18} />
              <span>{text(page.label)}</span>
            </Link>
          ))}
        </nav>
        <button
          className="nav-link sidebar-signout"
          disabled={pending}
          onClick={() => void signOut()}
        >
          <Icon name="logout" size={18} />
          <span>{text(pending ? 'Signing out…' : 'Sign out')}</span>
        </button>
      </section>
      <section className="sidebar-help surface">
        <Icon name="help" size={19} />
        <h3>{text('A little help getting started')}</h3>
        <p>
          {text(
            'Bring your class materials. Leave with a clearer place to study.',
          )}
        </p>
        <Link href="/help" onClick={close}>
          {text('Explore the guide')} <Icon name="arrow" size={16} />
        </Link>
      </section>
      <Link className="sidebar-about" href="/en" onClick={close}>
        {text('About Archy')}
      </Link>
    </>
  );
}
