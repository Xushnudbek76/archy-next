import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { CheckoutResult } from '@/libs/components/billing/CheckoutResult';
import '@/styles/billing.css';
export const metadata = {
  title: 'Payment status',
  referrer: 'no-referrer' as const,
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    customerKey?: string;
    authKey?: string;
  }>;
}) {
  const query = await searchParams;
  return (
    <ProtectedWorkspace returnTo="/settings/billing">
      <CheckoutResult
        orderId={query.orderId}
        customerKey={query.customerKey}
        authKey={query.authKey}
      />
    </ProtectedWorkspace>
  );
}
