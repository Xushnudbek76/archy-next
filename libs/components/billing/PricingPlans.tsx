'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  billingCatalog,
  startCheckout,
  billingError,
} from '@/api/billing-client';
import { Icon } from '@/libs/components/common/Icon';
import type { BillingCatalog } from '@/libs/types/billing';
import { useDemo } from '@/libs/hooks/useDemo';

export function PricingPlans({ signedIn = false }: { signedIn?: boolean }) {
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [revision, reload] = useState(0);
  const [consent, setConsent] = useState(false);
  const ids = useRef<Record<string, string>>({});
  const demo = useDemo();
  useEffect(() => {
    const abort = new AbortController();
    billingCatalog(abort.signal).then(
      (value) => {
        if (!abort.signal.aborted) {
          setCatalog(value);
          setError('');
        }
      },
      () => {
        if (!abort.signal.aborted) setError('Unable to load pricing.');
      },
    );
    return () => abort.abort();
  }, [revision]);
  async function checkout(plan: 'plus' | 'pro') {
    if (pending || !consent || demo) return;
    setPending(plan);
    setError('');
    try {
      ids.current[plan] ??= crypto.randomUUID();
      const data = await startCheckout(plan, ids.current[plan]);
      const { loadTossPayments } =
        await import('@tosspayments/tosspayments-sdk');
      const toss = await loadTossPayments(data.clientKey);
      await toss.payment({ customerKey: data.customerKey }).requestBillingAuth({
        method: 'CARD',
        successUrl: data.successUrl,
        failUrl: data.failUrl,
      });
    } catch (cause) {
      setError(billingError(cause));
    } finally {
      setPending('');
    }
  }
  return (
    <section>
      <div className="pricing-intro">
        <span className="eyebrow">A little more room to learn</span>
        <h1>Choose your study plan.</h1>
        <p>One workspace for your materials, notes, and practice.</p>
        <p className="billing-mode">Test billing · No live charges</p>
      </div>
      {catalog ? (
        <>
          <div className="pricing-grid">
            {catalog.plans.map((plan) => (
              <article
                className={`pricing-card ${plan.id === 'plus' ? 'pricing-featured' : ''}`}
                key={plan.id}
              >
                <p className="pricing-name">{plan.name}</p>
                <h2>
                  ₩{plan.amount.toLocaleString('en-US')}
                  <small>{plan.amount ? '/ month' : ''}</small>
                </h2>
                <p>
                  {plan.id === 'free'
                    ? 'Start with your everyday study tools.'
                    : plan.id === 'plus'
                      ? 'A monthly plan for a regular study routine.'
                      : 'A monthly plan for your busiest semester.'}
                </p>
                <ul>
                  <li>
                    <Icon name="check" size={16} /> Course and timetable
                    workspace
                  </li>
                  <li>
                    <Icon name="check" size={16} /> PDFs, recordings, and study
                    tools
                  </li>
                  <li>
                    <Icon name="check" size={16} /> Korean and English notes
                  </li>
                  <li>
                    <Icon name="check" size={16} /> Up to{' '}
                    {Math.floor(catalog.maxRecordingSeconds / 60)} minutes per
                    recording
                  </li>
                </ul>
                {plan.id === 'free' ? (
                  <Link
                    className="secondary-button"
                    href={signedIn ? '/dashboard' : '/signup?next=%2Fdashboard'}
                  >
                    Start studying
                  </Link>
                ) : !signedIn ? (
                  <Link
                    className="primary-button"
                    href="/login?next=%2Fsettings%2Fbilling"
                  >
                    Sign in to choose
                  </Link>
                ) : (
                  <button
                    className="primary-button"
                    disabled={!catalog.enabled || !consent || !!pending || demo}
                    onClick={() => void checkout(plan.id as 'plus' | 'pro')}
                  >
                    {pending === plan.id
                      ? 'Opening checkout…'
                      : `Choose ${plan.name}`}
                  </button>
                )}
              </article>
            ))}
          </div>
          {signedIn && catalog.enabled ? (
            <label className="billing-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                disabled={!!pending || demo}
              />{' '}
              I agree to the selected monthly test charge and automatic monthly
              renewal until cancelled.
            </label>
          ) : null}
          {!catalog.enabled ? (
            <p className="muted">
              Test checkout will be available after this installation’s Toss
              configuration is added. You can use the study workspace now.
            </p>
          ) : null}
        </>
      ) : (
        <p role="status">Loading plans…</p>
      )}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="text-link"
            onClick={() => reload((value) => value + 1)}
          >
            Reload
          </button>{' '}
          <Link href="/settings/billing">Check billing</Link>
        </p>
      ) : null}
    </section>
  );
}
