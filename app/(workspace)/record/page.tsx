import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { QuickRecordWorkspace } from '@/libs/components/recordings/QuickRecordWorkspace';
import { documentId } from '@/libs/types/documents';
import '@/styles/academics.css';
export const metadata = { title: 'Record a lecture' };
export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  return (
    <ProtectedWorkspace returnTo="/record">
      <QuickRecordWorkspace
        initialCourseId={documentId(courseId) ? courseId : ''}
      />
    </ProtectedWorkspace>
  );
}
