import { ResetPasswordForm } from '@/libs/components/account/ResetPasswordForm';
export const metadata = { title: 'New password' };
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string }>;
}) {
  const { uid, token } = await searchParams;
  return (
    <ResetPasswordForm
      uid={typeof uid === 'string' && uid.length <= 100 ? uid : ''}
      token={typeof token === 'string' && token.length <= 200 ? token : ''}
    />
  );
}
