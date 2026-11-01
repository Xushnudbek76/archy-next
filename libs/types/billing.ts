type Plan = 'free' | 'plus' | 'pro';
export type BillingOrder = {
  orderId: string;
  plan: 'plus' | 'pro';
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'review' | 'cancelled';
  createdAt: string;
  periodEnd: string;
};
export type BillingCatalog = {
  enabled: boolean;
  mode: 'test';
  currency: 'KRW';
  consent: 'monthly-test-v1';
  plans: { id: Plan; name: string; amount: number }[];
  maxRecordingSeconds: number;
};
export type BillingSummary = {
  mode: 'test';
  plan: Plan;
  usageSeconds: number;
  usageSince: string;
  subscription: null | {
    plan: 'plus' | 'pro';
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  payments: BillingOrder[];
};
export type Checkout = BillingOrder & {
  requestId: string;
  clientKey: string;
  customerKey: string;
  mode: 'test';
  successUrl: string;
  failUrl: string;
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length < 50 &&
  Number.isFinite(Date.parse(value));
export const isOrderId = (value: unknown): value is string =>
  typeof value === 'string' && /^archy_[0-9a-f]{32}$/.test(value);
const paidPlan = (value: unknown) => value === 'plus' || value === 'pro';
export function isBillingOrder(value: unknown): value is BillingOrder {
  return (
    object(value) &&
    isOrderId(value.orderId) &&
    paidPlan(value.plan) &&
    Number.isSafeInteger(value.amount) &&
    Number(value.amount) > 0 &&
    ['pending', 'processing', 'paid', 'failed', 'review', 'cancelled'].includes(
      String(value.status),
    ) &&
    date(value.createdAt) &&
    date(value.periodEnd)
  );
}
export function isCatalog(value: unknown): value is BillingCatalog {
  return (
    object(value) &&
    typeof value.enabled === 'boolean' &&
    value.mode === 'test' &&
    value.currency === 'KRW' &&
    value.consent === 'monthly-test-v1' &&
    Number.isSafeInteger(value.maxRecordingSeconds) &&
    Number(value.maxRecordingSeconds) > 0 &&
    Array.isArray(value.plans) &&
    value.plans.length > 0 &&
    value.plans.length <= 3 &&
    value.plans.every(
      (plan) =>
        object(plan) &&
        ['free', 'plus', 'pro'].includes(String(plan.id)) &&
        typeof plan.name === 'string' &&
        plan.name.length <= 60 &&
        Number.isSafeInteger(plan.amount) &&
        Number(plan.amount) >= 0,
    )
  );
}
export function isBillingSummary(value: unknown): value is BillingSummary {
  return (
    object(value) &&
    value.mode === 'test' &&
    ['free', 'plus', 'pro'].includes(String(value.plan)) &&
    typeof value.usageSeconds === 'number' &&
    Number.isFinite(value.usageSeconds) &&
    value.usageSeconds >= 0 &&
    date(value.usageSince) &&
    (value.subscription === null ||
      (object(value.subscription) &&
        paidPlan(value.subscription.plan) &&
        date(value.subscription.periodEnd) &&
        typeof value.subscription.cancelAtPeriodEnd === 'boolean')) &&
    Array.isArray(value.payments) &&
    value.payments.length <= 50 &&
    value.payments.every(isBillingOrder)
  );
}
