import { forwardOAuthRequest, oauthCallback } from '@/api/oauth-proxy';
export const dynamic = 'force-dynamic';
async function handle(
  request: Request,
  context: { params: Promise<{ parts: string[] }> },
) {
  const { parts } = await context.params;
  return parts.length === 2 && parts[1] === 'callback'
    ? oauthCallback(request, parts[0]!)
    : forwardOAuthRequest(request, parts);
}
export { handle as GET, handle as POST };
