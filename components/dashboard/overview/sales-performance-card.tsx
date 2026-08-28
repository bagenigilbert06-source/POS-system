'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

type SalesPoint = { date: string; revenue: number; transactions: number };
type Range = 'today' | '7-days' | '30-days' | 'month';

interface SalesPerformanceCardProps {
  currency: string;
  data: SalesPoint[];
}

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7-days', label: '7 days' },
  { value: '30-days', label: '30 days' },
  { value: 'month', label: 'This month' },
];

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function compactCurrency(value: number, currency: string) {
  const symbols: Record<string, string> = {
    KES: 'KES',
    USD: '$',
    EUR: '€',
    GBP: '£',
    UGX: 'USh',
    TZS: 'TSh',
    RWF: 'RF',
  };
  const absolute = Math.abs(value);
  const scale =
    absolute >= 1_000_000
      ? { divisor: 1_000_000, suffix: 'M' }
      : absolute >= 1_000
        ? { divisor: 1_000, suffix: 'K' }
        : { divisor: 1, suffix: '' };
  const scaled = value / scale.divisor;
  return `${symbols[currency] ?? currency} ${scaled.toFixed(scaled >= 10 || Number.isInteger(scaled) ? 0 : 1)}${scale.suffix}`;
}

function PerformanceTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: SalesPoint & { fullDate: string } }>;
  currency: string;
}) {
  const point = payload?.[0]?.payload as
    | (SalesPoint & { fullDate: string })
    | undefined;
  if (!active || !point) return null;

  return (
    <div className="min-w-44 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 shadow-xl">
      <p className="text-[0.68rem] font-semibold text-[var(--dashboard-muted)]">
        {point.fullDate}
      </p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-5 text-xs">
          <span className="text-[var(--dashboard-muted)]">Revenue</span>
          <span className="font-bold tabular-nums text-[var(--dashboard-text)]">
            {formatCurrency(point.revenue, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5 text-xs">
          <span className="text-[var(--dashboard-muted)]">Completed sales</span>
          <span className="font-bold tabular-nums text-[var(--dashboard-text)]">
            {formatNumber(point.transactions)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SalesPerformanceCard({
  currency,
  data,
}: SalesPerformanceCardProps) {
  const [range, setRange] = useState<Range>('month');
  const [rangeOpen, setRangeOpen] = useState(false);

  const view = useMemo(() => {
    const latest = data.at(-1);
    const days =
      range === 'today'
        ? 1
        : range === '7-days'
          ? 7
          : range === '30-days'
            ? 30
            : latest
              ? parseDate(latest.date).getDate()
              : 1;
    const current = data.slice(-days);
    const previous = data.slice(-(days * 2), -days);
    const revenue = current.reduce((sum, point) => sum + point.revenue, 0);
    const transactions = current.reduce(
      (sum, point) => sum + point.transactions,
      0
    );
    const previousRevenue = previous.reduce(
      (sum, point) => sum + point.revenue,
      0
    );
    const change =
      previousRevenue > 0
        ? ((revenue - previousRevenue) / previousRevenue) * 100
        : revenue > 0
          ? null
          : 0;

    return {
      revenue,
      transactions,
      average: transactions ? revenue / transactions : 0,
      change,
      points: current.map((point) => ({
        ...point,
        label: parseDate(point.date).toLocaleDateString(
          'en-KE',
          days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }
        ),
        fullDate: parseDate(point.date).toLocaleDateString('en-KE', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      })),
    };
  }, [data, range]);

  const comparison =
    view.change === null
      ? {
          text: 'No previous-period comparison',
          tone: 'text-[var(--dashboard-muted)]',
        }
      : view.change > 0
        ? {
            text: `+${view.change.toFixed(1)}% vs previous period`,
            tone: 'text-[var(--dashboard-success)]',
          }
        : view.change < 0
          ? {
              text: `${view.change.toFixed(1)}% vs previous period`,
              tone: 'text-[var(--dashboard-danger)]',
            }
          : {
              text: 'No change vs previous period',
              tone: 'text-[var(--dashboard-muted)]',
            };

  return (
    <article className="flex min-h-[354px] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-[var(--dashboard-border)] px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.015em] text-[var(--dashboard-text)]">
            Revenue trend
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-muted)]">
            Daily sales revenue for the selected period.
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={rangeOpen}
            aria-label="Revenue trend date range"
            onClick={() => setRangeOpen((open) => !open)}
            className="flex h-8 min-w-[110px] items-center justify-between gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2.5 text-xs font-semibold text-[var(--dashboard-text)] outline-none transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] focus:border-transparent focus:ring-0"
          >
            {RANGE_OPTIONS.find((option) => option.value === range)?.label}
            <span className="text-[var(--dashboard-muted)]">⌄</span>
          </button>
          {rangeOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1 shadow-lg"
            >
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={range === option.value}
                  onClick={() => {
                    setRange(option.value);
                    setRangeOpen(false);
                  }}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-[var(--dashboard-text)] outline-none transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus:bg-[var(--dashboard-accent-soft)] focus:text-[var(--dashboard-accent)]"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-3 pt-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--dashboard-muted)]">
              Sales revenue
            </p>
            <p className="mt-1 text-[1.25rem] font-semibold leading-none tracking-[-0.025em] tabular-nums text-[var(--dashboard-text)]">
              {formatCurrency(view.revenue, currency)}
            </p>
          </div>
          <p
            className={`pb-0.5 text-[0.68rem] font-semibold ${comparison.tone}`}
          >
            {comparison.text}
          </p>
        </div>

        <div
          className="mt-3 h-[126px] min-h-[126px] w-full"
          role="img"
          aria-label="Revenue trend over the selected period"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={view.points}
              margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--dashboard-chart-grid)"
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }}
                minTickGap={26}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 9 }}
                width={52}
                tickFormatter={(value) =>
                  compactCurrency(Number(value), currency)
                }
                tickCount={3}
              />
              <Tooltip
                cursor={{
                  stroke: 'var(--dashboard-accent)',
                  strokeDasharray: '3 4',
                  opacity: 0.55,
                }}
                content={<PerformanceTooltip currency={currency} />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--dashboard-accent)"
                strokeWidth={2.5}
                fill="var(--dashboard-accent-soft)"
                activeDot={{
                  r: 4,
                  fill: 'var(--dashboard-accent)',
                  stroke: 'var(--dashboard-surface)',
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationBegin={0}
                animationDuration={700}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <dl className="mt-auto grid grid-cols-3 divide-x divide-[var(--dashboard-border)] border-t border-[var(--dashboard-border)] pt-3">
          <div className="pr-3">
            <dt className="text-[0.62rem] font-medium text-[var(--dashboard-muted)]">
              Revenue
            </dt>
            <dd className="mt-0.5 truncate text-xs font-bold tabular-nums text-[var(--dashboard-text)]">
              {compactCurrency(view.revenue, currency)}
            </dd>
          </div>
          <div className="px-3">
            <dt className="text-[0.62rem] font-medium text-[var(--dashboard-muted)]">
              Completed sales
            </dt>
            <dd className="mt-0.5 text-xs font-bold tabular-nums text-[var(--dashboard-text)]">
              {formatNumber(view.transactions)}
            </dd>
          </div>
          <div className="pl-3">
            <dt className="text-[0.62rem] font-medium text-[var(--dashboard-muted)]">
              Average transaction
            </dt>
            <dd className="mt-0.5 truncate text-xs font-bold tabular-nums text-[var(--dashboard-text)]">
              {compactCurrency(view.average, currency)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
