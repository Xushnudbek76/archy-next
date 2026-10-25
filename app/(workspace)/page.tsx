import { ProtectedWorkspace } from '@/libs/components/layout/ProtectedWorkspace';
import { DocumentsWorkspace } from '@/libs/components/documents/DocumentsWorkspace';
import '@/styles/documents.css';
export const dynamic = 'force-dynamic';
export default function WorkspaceHomePage() {
  return (
    <ProtectedWorkspace returnTo="/">
      <DocumentsWorkspace />
    </ProtectedWorkspace>
  );
}
