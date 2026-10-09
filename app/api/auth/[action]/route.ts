import { forwardAuthRequest } from '@/api/auth-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  if (action === 'me') return new Response(null, { status: 404 });
  return forwardAuthRequest(request, action);
}
export async function POST(request: Request, context: Context) {
  return GET(request, context);
}
