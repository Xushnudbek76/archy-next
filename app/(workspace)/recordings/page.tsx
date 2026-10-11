import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { RecordingsWorkspace } from '@/libs/components/recordings/RecordingsWorkspace';
export const metadata = { title: 'Recordings' };
export default function RecordingsPage() {
  return (
    <ProtectedWorkspace returnTo="/recordings">
      <RecordingsWorkspace />
    </ProtectedWorkspace>
  );
}
