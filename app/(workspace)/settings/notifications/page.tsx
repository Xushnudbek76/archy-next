import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsSection } from '@/libs/components/account/SettingsSection';
import { NotificationSettings } from '@/libs/components/account/NotificationSettings';

export const metadata = { title: 'Notifications' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/notifications">
      <SettingsSection title="Notifications">
        <NotificationSettings />
      </SettingsSection>
    </ProtectedWorkspace>
  );
}
