import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
import { isOrderId } from '../libs/types/billing.ts';
const messages = {
  billing_disabled: 'Test billing is not configured.',
  active_subscription: 'Manage your existing subscription first.',
  payment_pending: 'Check the pending payment before trying again.',
  order_conflict: 'This checkout was already submitted.',
  checkout_expired: 'Start a new checkout.',
};
export function forwardBillingRequest(
  request: Request,
  parts: string[],
  supplied?: AuthConfiguration,
) {
  const route =
    parts.length === 0
      ? { path: '/v1/billing', method: 'GET' }
      : parts.length === 1 && parts[0] === 'catalog'
        ? { path: '/v1/billing/catalog', method: 'GET' }
        : parts.length === 1 &&
            ['checkout', 'confirm', 'cancel'].includes(parts[0]!)
          ? { path: `/v1/billing/${parts[0]}`, method: 'POST' }
          : parts[0] === 'orders' &&
              isOrderId(parts[1]) &&
              (parts.length === 2 ||
                (parts.length === 3 && parts[2] === 'reconcile'))
            ? {
                path: `/v1/billing/orders/${parts[1]}${parts[2] ? '/reconcile' : ''}`,
                method: parts.length === 2 ? 'GET' : 'POST',
              }
            : undefined;
  return forwardJsonRequest(
    request,
    route ? { ...route, timeoutMs: 85000, errorMessages: messages } : undefined,
    supplied,
  );
}
