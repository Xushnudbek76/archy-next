import { notFound } from 'next/navigation';
import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { DocumentWorkspace } from '@/libs/components/documents/DocumentWorkspace';
import { documentId } from '@/libs/types/documents';
import '@/styles/documents.css';
export const dynamic = 'force-dynamic';
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!documentId(id)) notFound();
  return (
    <ProtectedWorkspace returnTo={`/documents/${id}`}>
      <DocumentWorkspace key={id} id={id} />
    </ProtectedWorkspace>
  );
}
