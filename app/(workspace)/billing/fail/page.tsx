import Link from 'next/link';
import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
export const metadata = { title: 'Checkout not completed' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/billing">
      <section className="settings-workspace">
        <h1>Checkout was not completed.</h1>
        <p>
          No plan changes were made from this page. Check your payment status
          before starting another checkout.
        </p>
        <Link className="primary-button" href="/settings/billing">
          Open billing
        </Link>
      </section>
    </ProtectedWorkspace>
  );
}
