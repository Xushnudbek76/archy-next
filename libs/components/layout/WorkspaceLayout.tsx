'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { Brand } from '@/libs/components/common/Brand';
import { Icon } from '@/libs/components/common/Icon';
import { DemoNotice } from '@/libs/components/demo/DemoNotice';
import { useAuth } from '@/libs/hooks/useAuth';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import { MobileNavigation } from './MobileNavigation';
import { activeWorkspacePage } from './navigation';
import '@/styles/demo.css';

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();
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
          <Icon name="close" size={18} />
          Close menu
        </button>
        <WorkspaceNavigation pathname={pathname} close={close} />
      </dialog>
      <div className="workspace-body">
        <header className="topbar">
          <div className="topbar-title">
            <Link
              href="/dashboard"
              className="mobile-brand"
              aria-label="Archy home"
            >
              <Brand />
            </Link>
            <span className="desktop-page-label">
              {activeWorkspacePage(pathname).label}
            </span>
          </div>
          <div className="topbar-actions">
            <Link
              className="icon-button"
              href="/settings"
              aria-label="Account settings"
            >
              <Icon name="settings" />
            </Link>
            <button
              className="menu-toggle icon-button"
              type="button"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Icon name="menu" />
            </button>
          </div>
        </header>
        {auth.error ? (
          <div className="session-notice" role="alert">
            {auth.error}{' '}
            <button onClick={() => void auth.retry()}>Retry</button>
          </div>
        ) : null}
        <main id="main-content" tabIndex={-1}>
          <DemoNotice />
          {children}
        </main>
        <footer className="page-footer">
          <span>Archy · A space from class to review</span>
          <Link href="/help">Help & support</Link>
        </footer>
      </div>
      <MobileNavigation pathname={pathname} />
    </div>
  );
}
