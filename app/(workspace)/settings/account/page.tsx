import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsSection } from '@/libs/components/account/SettingsSection';
import { ProfileForm } from '@/libs/components/account/ProfileForm';

export const metadata = { title: 'Account' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/account">
      <SettingsSection title="Account">
        <ProfileForm />
      </SettingsSection>
    </ProtectedWorkspace>
  );
}
