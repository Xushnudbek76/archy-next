import { forwardStudyRequest } from '@/api/study-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function route(
  request: Request,
  context: { params: Promise<{ parts: string[] }> },
) {
  return forwardStudyRequest(request, (await context.params).parts);
}
export { route as GET, route as POST };
