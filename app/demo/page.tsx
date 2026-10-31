import Link from 'next/link';
import type { Metadata } from 'next';
import { demoAvailable } from '@/api/demo';
import { getCurrentUser, SessionUnavailable } from '@/api/session';
import { DemoEntry } from '@/libs/components/demo/DemoEntry';
import { Brand } from '@/libs/components/common/Brand';
import '@/styles/demo.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Try Archy',
  robots: { index: false, follow: false },
};
export default async function DemoPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof SessionUnavailable)) throw error;
    return (
      <main className="demo-page">
        <h1>Archy is temporarily unavailable</h1>
        <p>Refresh this page to check your session before opening the demo.</p>
        <Link href="/demo">Try again</Link>
      </main>
    );
  }
  const available = await demoAvailable();
  return (
    <main className="demo-page">
      <Link href="/en" aria-label="Archy home">
        <Brand />
      </Link>
      <h1>A study workspace you can explore.</h1>
      <p>
        Open two sample lecture PDFs, review prepared notes and quizzes, and
        read a saved tutor conversation. No signup or payment is needed.
      </p>
      <p>
        The shared demo is read-only. Its study results are hand-written
        examples, not live AI responses.
      </p>
      {user ? (
        <Link className="primary-button" href="/documents">
          Continue to your workspace
        </Link>
      ) : available ? (
        <DemoEntry />
      ) : (
        <p role="status">The demo is not available on this installation yet.</p>
      )}
      <div className="demo-links">
        <Link href="/login">Sign in</Link>
        <Link href="/signup">Create your own account</Link>
      </div>
    </main>
  );
}
