import Link from 'next/link';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="account-layout">
      <section className="account-story" aria-label="About Archy">
        <Link
          className="account-brand"
          href="/login"
          aria-label="Archy sign in"
        >
          archy.
        </Link>
        <div>
          <p className="account-eyebrow">A SPACE FOR YOUR LEARNING</p>
          <h2>
            Keep the lecture.
            <br />
            Find the clarity.
          </h2>
          <p>
            Your courses, recordings, and ideas. Together in one calm workspace.
          </p>
        </div>
        <span className="account-story-footer">One lecture at a time.</span>
      </section>
      <section className="account-content" aria-label="Your account">
        <div className="account-card">{children}</div>
        <footer className="account-footer">
          Made for your learning. <span>Archy</span>
        </footer>
      </section>
    </main>
  );
}
