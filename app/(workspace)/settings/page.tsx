import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { AccountSettings } from '@/libs/components/account/AccountSettings';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <ProtectedWorkspace returnTo="/settings">
      <AccountSettings />
    </ProtectedWorkspace>
  );
}
