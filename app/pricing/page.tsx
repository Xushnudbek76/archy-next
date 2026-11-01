import { PublicHeader } from '@/libs/components/marketing/PublicHeader';
import { PricingPlans } from '@/libs/components/billing/PricingPlans';
import { getCurrentUser, SessionUnavailable } from '@/api/session';
import '@/styles/landing.css';
import '@/styles/billing.css';
export const metadata = { title: 'Plans and pricing' };
export default async function Page() {
  let signedIn = false;
  try {
    signedIn = !!(await getCurrentUser());
  } catch (cause) {
    if (!(cause instanceof SessionUnavailable)) throw cause;
  }
  return (
    <main className="public-page">
      <PublicHeader />
      <PricingPlans signedIn={signedIn} />
    </main>
  );
}
