import { forwardCourseRequest } from '@/api/courses-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ parts?: string[] }> };

export async function GET(request: Request, context: Context) {
  return forwardCourseRequest(request, (await context.params).parts ?? []);
}
export const POST = GET;
export const PATCH = GET;
