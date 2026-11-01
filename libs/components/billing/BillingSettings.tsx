'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  billingSummary,
  cancelSubscription,
  reconcilePayment,
  billingError,
} from '@/api/billing-client';
import type { BillingSummary } from '@/libs/types/billing';
import { useDemo } from '@/libs/hooks/useDemo';

const dates = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
export function BillingSettings() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [revision, reload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const demo = useDemo();
  useEffect(() => {
    const abort = new AbortController();
    billingSummary(abort.signal).then(
      (value) => {
        if (!abort.signal.aborted) {
          setSummary(value);
          setError('');
        }
      },
      (cause) => {
        if (!abort.signal.aborted) setError(billingError(cause));
      },
    );
    return () => abort.abort();
  }, [revision]);
  async function act(action: () => Promise<unknown>) {
    if (pending || demo) return;
    setPending(true);
    setError('');
    try {
      await action();
      reload((value) => value + 1);
    } catch (cause) {
      setError(billingError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <p className="billing-mode">Test billing · No live charges</p>
      {summary ? (
        <>
          <section className="settings-note billing-current">
            <div>
              <span className="eyebrow">Current plan</span>
              <h2>
                Archy {summary.plan[0]!.toUpperCase() + summary.plan.slice(1)}
              </h2>
              <p>
                {Math.ceil(summary.usageSeconds / 60)} recorded minutes since{' '}
                {dates(summary.usageSince)}
              </p>
              {summary.subscription ? (
                <p>
                  {summary.subscription.cancelAtPeriodEnd
                    ? 'Access ends'
                    : 'Next renewal'}{' '}
                  on {dates(summary.subscription.periodEnd)}
                </p>
              ) : null}
            </div>
            <Link className="secondary-button" href="/pricing">
              View plans
            </Link>
          </section>
          {summary.subscription && !summary.subscription.cancelAtPeriodEnd ? (
            <form
              className="settings-note"
              onSubmit={(event) => {
                event.preventDefault();
                if (confirm) void act(cancelSubscription);
              }}
            >
              <h2>Cancel renewal</h2>
              <p>
                Your plan stays available until{' '}
                {dates(summary.subscription.periodEnd)}. Future monthly renewals
                stop; past payments are not refunded by this action.
              </p>
              <label className="billing-consent">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(event) => setConfirm(event.target.checked)}
                  disabled={pending || demo}
                />{' '}
                Stop renewing my plan
              </label>
              <button
                className="secondary-button"
                disabled={!confirm || pending || demo}
              >
                {pending ? 'Saving…' : 'Cancel renewal'}
              </button>
            </form>
          ) : null}
          <h2 className="settings-subheading">Payment history</h2>
          {summary.payments.length ? (
            <div className="payment-list">
              {summary.payments.map((payment) => (
                <section className="payment-row" key={payment.orderId}>
                  <div>
                    <strong>
                      Archy {payment.plan} · ₩{payment.amount.toLocaleString()}
                    </strong>
                    <small>
                      {dates(payment.createdAt)} · {payment.orderId}
                    </small>
                  </div>
                  <span className={`payment-status payment-${payment.status}`}>
                    {payment.status}
                  </span>
                  {['pending', 'processing', 'review'].includes(
                    payment.status,
                  ) ? (
                    <button
                      className="text-link"
                      disabled={pending || demo}
                      onClick={() =>
                        void act(() => reconcilePayment(payment.orderId))
                      }
                    >
                      Check status
                    </button>
                  ) : null}
                </section>
              ))}
            </div>
          ) : (
            <p className="muted">No payments yet.</p>
          )}
        </>
      ) : (
        <p role="status">Loading billing…</p>
      )}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="text-link"
            onClick={() => reload((value) => value + 1)}
          >
            Reload
          </button>
        </p>
      ) : null}
    </>
  );
}
