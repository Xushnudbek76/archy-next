import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsOverview } from '@/libs/components/account/SettingsOverview';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <ProtectedWorkspace returnTo="/settings">
      <SettingsOverview />
    </ProtectedWorkspace>
  );
}
