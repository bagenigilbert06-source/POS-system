'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CreditCard, WalletCards, Wifi } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

type Payment = { method: string; amount: number; transactions: number };

interface PaymentMixCardProps {
  currency: string;
  payments: Payment[];
}

const DEFAULT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'mpesa', label: 'M-Pesa' },
  { key: 'card', label: 'Card' },
  { key: 'bank_transfer', label: 'Bank transfer' },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function methodLabel(value: string) {
  if (normalize(value) === 'mpesa' || normalize(value) === 'm_pesa')
    return 'M-Pesa';
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PaymentMixCard({ currency, payments }: PaymentMixCardProps) {
  const rows = useMemo(() => {
    const totals = new Map(
      payments.map((payment) => [normalize(payment.method), payment])
    );
    const defaultKeys = new Set(DEFAULT_METHODS.map((method) => method.key));
    const standard = DEFAULT_METHODS.map((method) => {
      const payment =
        totals.get(method.key) ??
        (method.key === 'mpesa' ? totals.get('m_pesa') : undefined);
      return {
        ...method,
        method: method.key,
        amount: payment?.amount ?? 0,
        transactions: payment?.transactions ?? 0,
      };
    });
    const additional = payments
      .filter(
        (payment) =>
          !defaultKeys.has(normalize(payment.method)) &&
          normalize(payment.method) !== 'm_pesa'
      )
      .map((payment) => ({
        key: normalize(payment.method),
        label: methodLabel(payment.method),
        ...payment,
      }));

    return [...standard, ...additional];
  }, [payments]);

  const total = rows.reduce((sum, payment) => sum + payment.amount, 0);
  const transactionTotal = rows.reduce(
    (sum, payment) => sum + payment.transactions,
    0
  );

  if (!payments.length || total <= 0) {
    return (
      <article className="flex min-h-[354px] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
        <div className="flex h-16 items-center justify-between gap-4 border-b border-[var(--dashboard-border)] px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-0.015em] text-[var(--dashboard-text)]">
              Payment summary
            </h2>
            <p className="mt-0.5 truncate text-xs text-[var(--dashboard-muted)]">
              Sales collected by payment method this month.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
            <WalletCards className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">
            No payment data yet
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">
            Payment activity will appear here after sales are recorded.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article
      className="relative flex min-h-[354px] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm"
      aria-label={`Payment summary showing ${formatCurrency(total, currency)} across ${transactionTotal} completed sales`}
    >
      <div className="relative flex h-16 items-center justify-between gap-4 border-b border-[var(--dashboard-border)] px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.015em] text-[var(--dashboard-text)] dark:text-white">
            Payment summary
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-muted)] dark:text-white/50">
            Sales collected by payment method this month.
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:text-[#a47700] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a02e]/40 dark:text-white/55 dark:hover:text-[#f0c94c]"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a47700] dark:text-[#f0c94c]">
              This month
            </p>
            <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-[var(--dashboard-muted)] dark:text-white/40">
              Sales collected
            </p>
          </div>
          <span className="text-xl font-black italic tracking-tight text-[#8a6500] dark:text-white">
            PESA
          </span>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f3d36b,#a97a12)] shadow-inner">
            <CreditCard className="h-5 w-5 text-[#392b07]" />
          </span>
          <Wifi className="h-5 w-5 rotate-90 text-[#8a6500]/70 dark:text-white/60" />
        </div>

        <div className="mt-auto">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--dashboard-muted)] dark:text-white/45">
            Sales collected
          </p>
          <p className="mt-1 truncate text-[1.4rem] font-semibold leading-[1.15] tracking-[-0.025em] tabular-nums text-[var(--dashboard-text)] dark:text-white">
            {formatCurrency(total, currency)}
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.52rem] font-semibold uppercase tracking-[0.13em] text-[var(--dashboard-muted)] dark:text-white/40">
                Completed sales
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--dashboard-text)] dark:text-white/90">
                {transactionTotal}
              </p>
            </div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#8a6500]/75 dark:text-white/55">
              Pesaby
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
