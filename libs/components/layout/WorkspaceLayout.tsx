'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/libs/components/common/Icon';
import { useAuth } from '@/libs/hooks/useAuth';

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Overview', icon: 'grid' },
  { href: '/courses', label: 'Courses', icon: 'book' },
  { href: '/recordings', label: 'Recordings', icon: 'audio' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Archy home">
          <span className="brand-mark">a</span>
          <span>
            archy<span className="brand-dot">.</span>
          </span>
        </Link>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Icon name="spark" />
          </span>
          <p>
            A little more clarity.
            <br />
            <span>One lecture at a time.</span>
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="small-mark">a</span>
          <span>Archy workspace</span>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-slash">/</span>{' '}
            <strong>
              {navigation.find((item) => item.href === pathname)?.label ??
                'Overview'}
            </strong>
          </span>
          <div className="account-menu">
            <Link href="/settings">
              {auth.user.displayName || auth.user.email}
            </Link>
            <button
              type="button"
              disabled={auth.pending}
              onClick={() => void auth.signOut()}
            >
              {auth.pending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        {auth.error ? (
          <div className="session-notice" role="alert">
            {auth.error}{' '}
            <button type="button" onClick={() => void auth.retry()}>
              Retry
            </button>
          </div>
        ) : null}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>Made for your learning.</span>
          <span>Archy</span>
        </footer>
      </div>
    </div>
  );
}
