import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { DocumentsWorkspace } from '@/libs/components/documents/DocumentsWorkspace';
import '@/styles/documents.css';
import { documentId } from '@/libs/types/documents';
export const dynamic = 'force-dynamic';
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  const selected = documentId(courseId) ? courseId : '';
  return (
    <ProtectedWorkspace returnTo="/documents">
      <DocumentsWorkspace key={selected} initialCourseId={selected} />
    </ProtectedWorkspace>
  );
}
