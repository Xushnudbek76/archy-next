import { forwardBillingRequest } from '@/api/billing-proxy';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
async function handle(
  request: Request,
  context: { params: Promise<{ parts?: string[] }> },
) {
  const { parts = [] } = await context.params;
  return forwardBillingRequest(request, parts);
}
export { handle as GET, handle as POST };
