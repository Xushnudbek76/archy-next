'use client';
import Link from 'next/link';
import { useDemo } from '@/libs/hooks/useDemo';

export function DemoNotice() {
  if (!useDemo()) return null;
  return (
    <aside className="demo-notice" aria-label="Sample workspace">
      <strong>You’re exploring a read-only sample workspace.</strong>
      <p>
        Open a PDF to review its notes, quiz results and tutor conversation. All
        results are hand-written examples, with no live AI requests.
      </p>
      <details>
        <summary>Using your own materials</summary>
        <p>
          To upload, record or generate new results, sign out of the demo, then{' '}
          <Link href="/signup">create an account</Link> or{' '}
          <Link href="/login">sign in</Link>.
        </p>
      </details>
    </aside>
  );
}
