import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { TimetableWorkspace } from '@/libs/components/academics/TimetableWorkspace';
import '@/styles/academics.css';
export const metadata = { title: 'Timetable' };
export default function TimetablePage() {
  return (
    <ProtectedWorkspace returnTo="/timetable">
      <TimetableWorkspace />
    </ProtectedWorkspace>
  );
}
