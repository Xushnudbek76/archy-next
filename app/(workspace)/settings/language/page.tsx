import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsSection } from '@/libs/components/account/SettingsSection';
import { LanguageSettings } from '@/libs/components/account/LanguageSettings';

export const metadata = { title: 'Language' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/language">
      <SettingsSection title="Language">
        <LanguageSettings />
      </SettingsSection>
    </ProtectedWorkspace>
  );
}
