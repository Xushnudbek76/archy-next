import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { Overview } from '@/libs/components/homepage/Overview';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  return (
    <ProtectedWorkspace returnTo="/">
      <Overview />
    </ProtectedWorkspace>
  );
}
