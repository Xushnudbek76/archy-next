import { forwardJsonRequest } from '@/api/json-proxy';
import { tutorRoute } from '@/libs/types/tutor';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function route(
  request: Request,
  context: { params: Promise<{ parts: string[] }> },
) {
  const parts = (await context.params).parts;
  return forwardJsonRequest(
    request,
    new URL(request.url).search ? undefined : tutorRoute(parts, request.method),
  );
}
export { route as GET, route as POST };
