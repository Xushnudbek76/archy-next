import Link from 'next/link';
export const metadata = { title: 'Sign-in could not be completed' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <>
      <h1>Try signing in again.</h1>
      <p className="account-intro">
        {reason === 'existing-account'
          ? 'This email already has an Archy account. Use your existing sign-in method. Accounts are never linked automatically.'
          : 'This sign-in was cancelled, expired, or could not be verified.'}
      </p>
      <Link className="account-button" href="/login">
        Back to sign in
      </Link>
    </>
  );
}
