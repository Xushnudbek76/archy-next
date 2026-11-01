import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { BillingSettings } from '@/libs/components/billing/BillingSettings';
import '@/styles/billing.css';
export const metadata = { title: 'Billing' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/billing">
      <section className="settings-workspace">
        <h1>Billing</h1>
        <BillingSettings />
      </section>
    </ProtectedWorkspace>
  );
}
