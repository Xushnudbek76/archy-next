import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { CoursesWorkspace } from '@/libs/components/courses/CoursesWorkspace';

export const metadata = { title: 'Courses' };

export default function CoursesPage() {
  return (
    <ProtectedWorkspace returnTo="/courses">
      <CoursesWorkspace />
    </ProtectedWorkspace>
  );
}
