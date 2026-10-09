import { forwardAuthRequest } from '@/api/auth-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  return forwardAuthRequest(request, 'me');
}
