import { redirect } from 'next/navigation';
import { getCurrentUser, SessionUnavailable } from '@/api/session';
import { SessionProvider } from '@/libs/auth/SessionProvider';
import { SessionRetry } from '@/libs/components/account/SessionRetry';
import { safeReturnPath } from '@/libs/types/auth';
import { WorkspaceLayout } from './WorkspaceLayout';

export async function ProtectedWorkspace({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo: string;
}) {
  const destination = safeReturnPath(returnTo);
  let user;
  try {
    user = await getCurrentUser();
  } catch (cause) {
    if (cause instanceof SessionUnavailable)
      return <SessionRetry href={destination} />;
    throw cause;
  }
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);
  return (
    <SessionProvider initialUser={user}>
      <WorkspaceLayout>{children}</WorkspaceLayout>
    </SessionProvider>
  );
}
