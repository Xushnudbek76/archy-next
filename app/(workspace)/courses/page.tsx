import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { EmptyState } from '@/libs/components/common/EmptyState';

export const metadata = { title: 'Courses' };

export default function CoursesPage() {
  return (
    <ProtectedWorkspace returnTo="/courses">
      <EmptyState
        eyebrow="KEEP THE BIGGER PICTURE"
        title="Your courses"
        description="A home for the subjects you study and the ideas you discover."
        icon="book"
      />
    </ProtectedWorkspace>
  );
}
