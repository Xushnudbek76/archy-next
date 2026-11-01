import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { Overview } from '@/libs/components/homepage/Overview';
import '@/styles/academics.css';
import '@/styles/dashboard.css';
export const metadata = { title: 'Dashboard' };
export default function DashboardPage() {
  return (
    <ProtectedWorkspace returnTo="/dashboard">
      <Overview />
    </ProtectedWorkspace>
  );
}
