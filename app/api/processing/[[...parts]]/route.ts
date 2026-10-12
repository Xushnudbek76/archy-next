import { forwardProcessingRequest } from '@/api/processing-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ parts?: string[] }> };
export async function GET(request: Request, context: Context) {
  return forwardProcessingRequest(request, (await context.params).parts ?? []);
}
