import { redirect } from 'next/navigation';
import { getCurrentUser, SessionUnavailable } from '@/api/session';
import { LoginForm } from '@/libs/components/account/LoginForm';
import { SessionRetry } from '@/libs/components/account/SessionRetry';
import { safeReturnPath } from '@/libs/types/auth';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = safeReturnPath((await searchParams).next);
  let user;
  try {
    user = await getCurrentUser();
  } catch (cause) {
    if (cause instanceof SessionUnavailable)
      return (
        <SessionRetry href={`/login?next=${encodeURIComponent(returnTo)}`} />
      );
    throw cause;
  }
  if (user) redirect(returnTo);
  return <LoginForm returnTo={returnTo} />;
}
