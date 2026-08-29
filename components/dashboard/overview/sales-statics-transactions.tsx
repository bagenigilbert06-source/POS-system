'use client';

import Link from 'next/link';
import { ArrowUpRight, BarChart3, CalendarDays, Flag } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface Props {
  currency: string;
  revenue: number;
  expenses: number;
  series: DashboardOverview['monthlySalesSeries'];
  transactions: DashboardOverview['recentSales'];
  expensesList: DashboardOverview['recentExpenses'];
  invoices: DashboardOverview['recentInvoices'];
}

const tabs = ['Sales', 'Expenses', 'Invoices'] as const;

function shortReceiptNumber(receiptNo: string) {
  const finalSegment = receiptNo.split('-').filter(Boolean).at(-1);
  return finalSegment || receiptNo;
}

function SalesChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string; value?: number }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const sales = Number(
    payload.find((item) => item.dataKey === 'revenue')?.value ?? 0
  );
  const expenses = Math.abs(
    Number(payload.find((item) => item.dataKey === 'expense')?.value ?? 0)
  );
  const net = sales - expenses;
  return (
    <div className="min-w-[170px] rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 text-xs shadow-xl">
      <p className="font-bold text-[var(--dashboard-text)]">{label}</p>
      <div className="mt-2 space-y-1.5">
        <p className="flex justify-between gap-5 text-[var(--dashboard-muted)]">
          <span>Revenue</span>
          <strong className="text-[var(--dashboard-accent)]">
            {formatCurrency(sales, currency)}
          </strong>
        </p>
        <p className="flex justify-between gap-5 text-[var(--dashboard-muted)]">
          <span>Expenses</span>
          <strong className="text-[var(--dashboard-danger)]">
            {formatCurrency(expenses, currency)}
          </strong>
        </p>
        <p className="flex justify-between gap-5 border-t border-[var(--dashboard-border)] pt-1.5 text-[var(--dashboard-muted)]">
          <span>After expenses</span>
          <strong
            className={
              net >= 0
                ? 'text-[var(--dashboard-success)]'
                : 'text-[var(--dashboard-danger)]'
            }
          >
            {formatCurrency(net, currency)}
          </strong>
        </p>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'accent' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-[var(--dashboard-success)]'
      : tone === 'danger'
        ? 'text-[var(--dashboard-danger)]'
        : 'text-[var(--dashboard-accent)]';
  return (
    <div className="min-w-0 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-3 py-2.5">
      <p className="text-[0.66rem] font-medium text-[var(--dashboard-muted)]">
        {label}
      </p>
      <strong
        className={cn('mt-1 block truncate text-sm tabular-nums', color)}
        title={value}
      >
        {value}
      </strong>
    </div>
  );
}

export function SalesStaticsTransactions({
  currency,
  revenue,
  expenses,
  series,
  transactions,
  expensesList,
  invoices,
}: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Sales');
  const chartData = series.map((point) => ({
    ...point,
    expense: -point.expenses,
  }));
  const afterExpenses = revenue - expenses;
  const viewHref =
    tab === 'Sales'
      ? '/dashboard/sales'
      : tab === 'Expenses'
          ? '/dashboard/expenses'
          : '/dashboard/invoices';

  return (
    <section
      aria-label="Sales statistics and recent transactions"
      className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
    >
      <article className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
        <header className="flex h-16 items-center justify-between border-b border-[var(--dashboard-border)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Sales Statistics
            </h2>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--dashboard-border)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-text)]">
            <CalendarDays className="h-3 w-3" />
            {new Date().getFullYear()}
          </span>
        </header>
        <div className="p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="min-w-[8.5rem] rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] px-3 py-2">
              <div className="flex items-center gap-2">
                <strong className="text-base tabular-nums text-[var(--dashboard-text)]">
                  {formatCurrency(revenue, currency)}
                </strong>
                <span className="rounded border border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] px-2 py-0.5 text-[0.58rem] font-bold text-[var(--dashboard-success)]">
                  ↗ 25%
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                Revenue
              </p>
            </div>
            <div className="min-w-[8.5rem] rounded-lg border border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] px-3 py-2">
              <div className="flex items-center gap-2">
                <strong className="text-base tabular-nums text-[var(--dashboard-danger)]">
                  {formatCurrency(expenses, currency)}
                </strong>
                <span className="rounded border border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] px-2 py-0.5 text-[0.58rem] font-bold text-[var(--dashboard-danger)]">
                  ↘ 25%
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                Expense
              </p>
            </div>
            <SummaryStat
              label="After expenses"
              value={formatCurrency(afterExpenses, currency)}
              tone={afterExpenses >= 0 ? 'success' : 'danger'}
            />
          </div>
          <div className="mt-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
                barCategoryGap="42%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--dashboard-border)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: 'var(--dashboard-border)' }}
                  tickLine={false}
                  interval={0}
                  tick={{ fill: 'var(--dashboard-muted)', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tick={{ fill: 'var(--dashboard-muted)', fontSize: 10 }}
                />
                <Tooltip
                  cursor={{
                    fill: 'var(--dashboard-accent-soft)',
                    fillOpacity: 0.45,
                  }}
                  content={<SalesChartTooltip currency={currency} />}
                />
                <Bar
                  dataKey="revenue"
                  stackId="monthly"
                  name="Revenue"
                  fill="var(--dashboard-accent)"
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="expense"
                  stackId="monthly"
                  name="Expense"
                  fill="var(--dashboard-danger)"
                  radius={[0, 0, 5, 5]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
        <header className="flex h-16 items-center justify-between border-b border-[var(--dashboard-border)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <Flag className="h-4 w-4" />
            </span>
            <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Recent Transactions
            </h2>
          </div>
          <Link
            href={viewHref}
            className="group inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
          >
            View all{' '}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </header>
        <nav
          className="grid grid-cols-3 border-b border-[var(--dashboard-border)]"
          aria-label="Transaction type"
        >
          {tabs.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                'h-10 border-b-2 text-xs font-medium transition-colors',
                tab === item
                  ? 'border-[var(--dashboard-accent)] text-[var(--dashboard-accent)]'
                  : 'border-transparent text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]'
              )}
            >
              {item}
            </button>
          ))}
        </nav>
        <TransactionTable
          currency={currency}
          rows={
            tab === 'Sales'
              ? transactions.map((sale) => ({
                  id: sale.id,
                  name: sale.customerName ?? 'Walk-in customer',
                  reference: shortReceiptNumber(sale.receiptNo),
                  date: sale.createdAt,
                  status: sale.status === 'completed' ? 'paid' : sale.status,
                  amount: sale.total,
                }))
              : tab === 'Expenses'
                  ? expensesList
                  : invoices
          }
          label={
            tab === 'Expenses'
                ? 'Expense'
                : 'Customer'
          }
          dateLabel={tab === 'Invoices' ? 'Due Date' : 'Date'}
        />
      </article>
    </section>
  );
}

function TransactionTable({
  currency,
  rows,
  label,
  dateLabel,
}: {
  currency: string;
  rows: Array<{
    id: string;
    name: string;
    reference: string;
    date: Date;
    status: string;
    amount: number;
  }>;
  label: string;
  dateLabel: string;
}) {
  if (!rows.length)
    return (
      <div className="flex h-[17.5rem] items-center justify-center px-6 text-center text-xs text-[var(--dashboard-muted)]">
        No recent records.
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[610px] table-fixed text-left">
        <thead className="bg-[var(--dashboard-surface-subtle)] text-[0.66rem] font-semibold text-[var(--dashboard-text)]">
          <tr className="h-9">
            <th className="w-[42%] px-5">{label}</th>
            <th className="w-[25%] px-4">{dateLabel}</th>
            <th className="w-[17%] px-4">Status</th>
            <th className="w-[16%] px-5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((record) => {
            const normalized = record.status.toLowerCase();
            const positive =
              normalized === 'paid' ||
              normalized === 'completed' ||
              normalized === 'received' ||
              normalized === 'cash' ||
              normalized === 'mpesa' ||
              normalized === 'card';
            const warning =
              normalized.includes('partial') || normalized.includes('overdue');
            const refunded = normalized.includes('refund');
            const initials = record.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase();
            return (
              <tr
                key={record.id}
                className="h-[3.9rem] border-b border-[var(--dashboard-border)] last:border-b-0"
              >
                <td className="px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--dashboard-surface-subtle)] text-[0.62rem] font-bold text-[var(--dashboard-muted)] ring-1 ring-[var(--dashboard-border)]">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--dashboard-text)]">
                        {record.name}
                      </p>
                      <p className="mt-1 truncate text-[0.67rem] text-[var(--dashboard-accent)]">
                        #{record.reference}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 text-xs text-[var(--dashboard-muted)]">
                  {record.date.toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4">
                  <span
                    className={cn(
                      'inline-flex h-5 items-center rounded border px-2 text-[0.57rem] font-bold capitalize',
                      positive
                        ? 'border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]'
                        : refunded
                          ? 'border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]'
                          : warning
                            ? 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
                            : 'border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]'
                    )}
                  >
                    • {record.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 text-right text-xs font-semibold tabular-nums text-[var(--dashboard-text)]">
                  {formatCurrency(record.amount, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
