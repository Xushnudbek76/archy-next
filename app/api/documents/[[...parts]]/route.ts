import { forwardDocumentRequest } from '@/api/documents-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ parts?: string[] }> };
async function route(request: Request, context: Context) {
  return forwardDocumentRequest(request, (await context.params).parts ?? []);
}
export { route as GET, route as POST, route as PATCH };
