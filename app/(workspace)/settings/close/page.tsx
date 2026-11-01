import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsSection } from '@/libs/components/account/SettingsSection';
import { CloseAccount } from '@/libs/components/account/CloseAccount';

export const metadata = { title: 'Close account' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/close">
      <SettingsSection title="Close account">
        <CloseAccount />
      </SettingsSection>
    </ProtectedWorkspace>
  );
}
