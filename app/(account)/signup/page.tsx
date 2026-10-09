import { SignupForm } from '@/libs/components/account/SignupForm';
import { safeReturnPath } from '@/libs/types/auth';
export const metadata = { title: 'Create account' };
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <SignupForm returnTo={safeReturnPath((await searchParams).next)} />;
}
