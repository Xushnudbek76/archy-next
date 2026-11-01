import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCatalog,
  isBillingSummary,
  isBillingOrder,
} from '../libs/types/billing.ts';

test('billing rejects unverified statuses and malformed prices', () => {
  const order = {
    orderId: 'archy_' + 'a'.repeat(32),
    plan: 'plus',
    amount: 9900,
    status: 'paid',
    createdAt: '2026-11-01T00:00:00Z',
    periodEnd: '2026-12-01T00:00:00Z',
  };
  assert.equal(isBillingOrder(order), true);
  assert.equal(isBillingOrder({ ...order, status: 'success' }), false);
  assert.equal(isBillingOrder({ ...order, amount: '9900' }), false);
  assert.equal(
    isCatalog({
      enabled: false,
      mode: 'test',
      currency: 'KRW',
      consent: 'monthly-test-v1',
      plans: [{ id: 'free', name: 'Free', amount: 0 }],
      maxRecordingSeconds: 1200,
    }),
    true,
  );
  assert.equal(
    isBillingSummary({
      mode: 'test',
      plan: 'free',
      usageSeconds: 0,
      usageSince: '2026-11-01T00:00:00Z',
      subscription: null,
      payments: [order],
    }),
    true,
  );
  assert.equal(isBillingSummary({ plan: 'pro', payments: [] }), false);
});
