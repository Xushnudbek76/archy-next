import { ConfirmEmailForm } from '@/libs/components/account/ConfirmEmailForm';
export const metadata = { title: 'Confirm email' };
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <ConfirmEmailForm
      token={typeof token === 'string' && token.length <= 2048 ? token : ''}
    />
  );
}
