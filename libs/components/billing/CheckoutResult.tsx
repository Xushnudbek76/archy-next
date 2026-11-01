'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  confirmCheckout,
  readBillingOrder,
  billingError,
} from '@/api/billing-client';
import { isOrderId, type BillingOrder } from '@/libs/types/billing';

type Credentials = { orderId: string; customerKey: string; authKey: string };
export function CheckoutResult({
  orderId,
  customerKey,
  authKey,
}: {
  orderId?: string;
  customerKey?: string;
  authKey?: string;
}) {
  if (
    !isOrderId(orderId) ||
    !customerKey ||
    customerKey.length > 50 ||
    !authKey ||
    authKey.length > 300
  )
    return (
      <section className="checkout-result">
        <h1>Check your payment status.</h1>
        <p>
          This checkout link is incomplete. Open billing to see the verified
          result.
        </p>
        <Link className="primary-button" href="/settings/billing">
          Open billing
        </Link>
      </section>
    );
  return <CheckoutConfirmation values={{ orderId, customerKey, authKey }} />;
}

function CheckoutConfirmation({ values }: { values: Credentials }) {
  const [payment, setPayment] = useState<BillingOrder | null>(null);
  const [error, setError] = useState('');
  const [revision, reload] = useState(0);
  const submitted = useRef(false);
  const { orderId, customerKey, authKey } = values;
  useEffect(() => {
    const abort = new AbortController();
    history.replaceState(history.state, '', '/billing/success');
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      try {
        const value = !submitted.current
          ? await confirmCheckout(orderId, customerKey, authKey)
          : await readBillingOrder(orderId, abort.signal);
        if (abort.signal.aborted) return;
        submitted.current = true;
        setPayment(value);
        setError('');
        if (value.status === 'pending' || value.status === 'processing')
          timer = setTimeout(() => reload((number) => number + 1), 4000);
      } catch (cause) {
        if (!abort.signal.aborted) setError(billingError(cause));
      }
    }
    void check();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [revision, orderId, customerKey, authKey]);
  return (
    <section className="checkout-result">
      <span className="eyebrow">Test checkout</span>
      <h1>
        {payment?.status === 'paid'
          ? 'Your plan is ready.'
          : payment?.status === 'cancelled'
            ? 'This payment was cancelled.'
            : payment?.status === 'failed'
              ? 'Payment was not completed.'
              : 'Checking your payment.'}
      </h1>
      <p>
        {payment?.status === 'paid'
          ? 'The payment was verified by the server and your plan has been updated.'
          : 'Your plan changes only after the provider confirms the payment.'}
      </p>
      {payment ? (
        <p>
          Status: <strong>{payment.status}</strong>
        </p>
      ) : null}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="text-link"
            onClick={() => reload((number) => number + 1)}
          >
            Check again
          </button>
        </p>
      ) : null}
      <Link className="primary-button" href="/settings/billing">
        Open billing
      </Link>
    </section>
  );
}
