'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { Brand } from '@/libs/components/common/Brand';
import { Icon, type IconName } from '@/libs/components/common/Icon';
import { useAuth } from '@/libs/hooks/useAuth';

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Overview', icon: 'grid' },
  { href: '/courses', label: 'Courses', icon: 'book' },
  { href: '/recordings', label: 'Recordings', icon: 'audio' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

function WorkspaceNavigation({
  pathname,
  close,
}: {
  pathname: string;
  close?: () => void;
}) {
  return (
    <>
      <Link className="brand" href="/" aria-label="Archy home" onClick={close}>
        <Brand />
      </Link>
      <p className="nav-caption">YOUR WORKSPACE</p>
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
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
        <p>
          A little more clarity.
          <br />
          <span>One lecture at a time.</span>
        </p>
      </div>
      <div className="sidebar-footer">
        <Link href="/en" onClick={close}>
          About Archy
        </Link>
      </div>
    </>
  );
}

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();
  const title =
    navigation.find((item) => item.href === pathname)?.label ?? 'My documents';
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar desktop-sidebar">
        <WorkspaceNavigation pathname={pathname} />
      </aside>
      <dialog
        ref={drawer}
        className="navigation-drawer"
        aria-label="Workspace navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <button
          className="drawer-close secondary-button"
          type="button"
          onClick={close}
        >
          Close menu
        </button>
        <WorkspaceNavigation pathname={pathname} close={close} />
      </dialog>
      <div className="workspace-body">
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="menu-toggle secondary-button"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              Menu
            </button>
            <strong>{title}</strong>
          </div>
          <div className="account-menu">
            <Link href="/settings" aria-label="Account settings">
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
