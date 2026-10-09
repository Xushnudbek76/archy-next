import Link from 'next/link';
import { safeReturnPath } from '@/libs/types/auth';

export function FormError({ message }: { message: string }) {
  return message ? (
    <p className="account-error" role="alert" aria-label="Form error">
      {message}
    </p>
  ) : null;
}

export function AuthSuccess({
  title,
  children,
  returnTo = '/',
}: {
  title: string;
  children: React.ReactNode;
  returnTo?: string;
}) {
  return (
    <div className="account-success" role="status">
      <span className="success-mark" aria-hidden="true">
        ✓
      </span>
      <h1>{title}</h1>
      <p>{children}</p>
      <Link
        className="account-button"
        href={
          returnTo === '/'
            ? '/login'
            : `/login?next=${encodeURIComponent(safeReturnPath(returnTo))}`
        }
      >
        Sign in
      </Link>
    </div>
  );
}

export function AccountTabs({
  active,
  next = '/',
}: {
  active: 'login' | 'signup';
  next?: string;
}) {
  const query = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;
  return (
    <nav className="account-tabs" aria-label="Account navigation">
      <Link
        href={`/login${query}`}
        aria-current={active === 'login' ? 'page' : undefined}
      >
        Sign in
      </Link>
      <Link
        href={`/signup${query}`}
        aria-current={active === 'signup' ? 'page' : undefined}
      >
        Create account
      </Link>
    </nav>
  );
}
