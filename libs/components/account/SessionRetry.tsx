export function SessionRetry({ href }: { href: string }) {
  return (
    <section className="session-retry" role="alert">
      <h1>We couldn’t reach your account.</h1>
      <p>Your session hasn’t been cleared. Try again in a moment.</p>
      <a className="account-button" href={href}>
        Try again
      </a>
    </section>
  );
}
