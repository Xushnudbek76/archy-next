import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { SettingsSection } from '@/libs/components/account/SettingsSection';
import { NoteFormatSettings } from '@/libs/components/account/NoteFormatSettings';

export const metadata = { title: 'Note formats' };
export default function Page() {
  return (
    <ProtectedWorkspace returnTo="/settings/formats">
      <SettingsSection title="Note formats">
        <NoteFormatSettings />
      </SettingsSection>
    </ProtectedWorkspace>
  );
}
