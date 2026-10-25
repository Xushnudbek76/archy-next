import Link from 'next/link';
import { Brand } from '@/libs/components/common/Brand';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="account-layout">
      <header className="account-heading">
        <Link href="/en" aria-label="Archy home">
          <Brand />
        </Link>
        <Link href="/en" className="account-back">
          Back to Archy
        </Link>
      </header>
      <section className="account-content" aria-label="Your account">
        <div className="account-card">{children}</div>
        <footer className="account-footer">
          Your materials. Your space to learn.
        </footer>
      </section>
    </main>
  );
}
