import { forwardJsonRequest } from '@/api/json-proxy';
import { tutorRoute } from '@/libs/types/tutor';
import { forwardTutorStream } from '@/api/tutor-stream-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function route(
  request: Request,
  context: { params: Promise<{ parts: string[] }> },
) {
  const parts = (await context.params).parts;
  if (
    parts.length === 3 &&
    parts[0] === 'conversations' &&
    parts[2] === 'messages'
  )
    return forwardTutorStream(request, parts[1]!);
  return forwardJsonRequest(
    request,
    new URL(request.url).search ? undefined : tutorRoute(parts, request.method),
  );
}
export { route as GET, route as POST };
