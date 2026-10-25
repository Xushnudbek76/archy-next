import { forwardDocumentRequest } from '@/api/documents-proxy';
import { forwardPdfRequest } from '@/api/document-pdf-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ parts?: string[] }> };
async function route(request: Request, context: Context) {
  const parts = (await context.params).parts ?? [];
  if (parts.length === 2 && parts[1] === 'pdf')
    return forwardPdfRequest(request, parts[0]!);
  return forwardDocumentRequest(request, parts);
}
export { route as GET, route as POST, route as PATCH, route as HEAD };
