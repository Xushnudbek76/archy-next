import { ApiError, jsonRequest } from './json-client.ts';
import {
  isCatalog,
  isBillingSummary,
  isBillingOrder,
  type Checkout,
} from '../libs/types/billing.ts';
const invalid = () =>
  new ApiError(
    503,
    'invalid_response',
    'Unable to verify billing data. Refresh before retrying.',
  );
export async function billingCatalog(signal?: AbortSignal) {
  const value = await jsonRequest(
    '/api/billing/catalog',
    undefined,
    undefined,
    { signal },
  );
  if (!isCatalog(value)) throw invalid();
  return value;
}
export async function billingSummary(signal?: AbortSignal) {
  const value = await jsonRequest('/api/billing', undefined, undefined, {
    signal,
  });
  if (!isBillingSummary(value)) throw invalid();
  return value;
}
export async function startCheckout(plan: 'plus' | 'pro', requestId: string) {
  const value = await jsonRequest('/api/billing/checkout', {
    plan,
    requestId,
    consent: 'monthly-test-v1',
  });
  if (!isBillingOrder(value)) throw invalid();
  const data = value as Partial<Checkout>;
  if (
    data.mode !== 'test' ||
    !data.clientKey?.startsWith('test_ck_') ||
    typeof data.customerKey !== 'string' ||
    data.customerKey.length < 22 ||
    data.customerKey.length > 50 ||
    typeof data.successUrl !== 'string' ||
    typeof data.failUrl !== 'string' ||
    typeof data.requestId !== 'string'
  )
    throw invalid();
  for (const url of [data.successUrl, data.failUrl]) {
    const parsed = new URL(url);
    if (
      parsed.origin !== window.location.origin ||
      parsed.username ||
      parsed.password ||
      !['/billing/success', '/billing/fail'].includes(parsed.pathname)
    )
      throw invalid();
  }
  return data as Checkout;
}
export async function confirmCheckout(
  orderId: string,
  customerKey: string,
  authKey: string,
) {
  const value = await jsonRequest(
    '/api/billing/confirm',
    { orderId, customerKey, authKey },
    'POST',
    { timeoutMs: 90000 },
  );
  if (!isBillingOrder(value)) throw invalid();
  return value;
}
export async function readBillingOrder(id: string, signal?: AbortSignal) {
  const value = await jsonRequest(
    `/api/billing/orders/${id}`,
    undefined,
    undefined,
    { signal },
  );
  if (!isBillingOrder(value)) throw invalid();
  return value;
}
export async function reconcilePayment(id: string) {
  const value = await jsonRequest(
    `/api/billing/orders/${id}/reconcile`,
    {},
    'POST',
    { timeoutMs: 80000 },
  );
  if (!isBillingOrder(value)) throw invalid();
  return value;
}
export async function cancelSubscription() {
  const value = await jsonRequest('/api/billing/cancel', {});
  if (!isBillingSummary(value)) throw invalid();
  return value;
}
export function billingError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 401 || cause.status === 403)
      return 'Sign in to your own workspace to manage billing.';
    if (cause.code === 'active_subscription')
      return 'Manage your current plan in billing settings.';
    if (cause.code === 'payment_pending' || cause.code === 'order_conflict')
      return 'There is a pending checkout. Check billing settings before starting another.';
    if (cause.code === 'billing_disabled')
      return 'Test checkout is not configured for this installation.';
  }
  return 'Unable to verify this payment yet. Check billing settings before trying again.';
}
