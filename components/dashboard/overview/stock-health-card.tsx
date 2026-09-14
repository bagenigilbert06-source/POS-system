'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  PackageOpen,
  TriangleAlert,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';
import { useWorkspace } from '@/lib/context/workspace-context';
import {
  countProductTerm,
  getProductTerminology,
} from '@/lib/products/terminology';

interface StockHealthCardProps {
  stock: { healthy: number; low: number; out: number };
}

const STATUS_COLORS = {
  healthy: '#48b78a',
  low: '#dfae48',
  out: '#c97a72',
};

export function StockHealthCard({ stock }: StockHealthCardProps) {
  const { config } = useWorkspace();
  const terminology = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rows = useMemo(
    () =>
      [
        {
          key: 'healthy',
          label: 'In stock',
          value: Math.max(stock.healthy, 0),
          color: STATUS_COLORS.healthy,
        },
        {
          key: 'low',
          label: 'Low stock',
          value: Math.max(stock.low, 0),
          color: STATUS_COLORS.low,
        },
        {
          key: 'out',
          label: 'Out of stock',
          value: Math.max(stock.out, 0),
          color: STATUS_COLORS.out,
        },
      ].map((row, index) => ({ ...row, index })),
    [stock.healthy, stock.low, stock.out]
  );
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const healthyPercentage = total
    ? Math.round((rows[0].value / total) * 100)
    : 0;
  const activeIndex = hoveredIndex ?? selectedIndex;
  const activeRow = activeIndex === null ? undefined : rows[activeIndex];
  const centerPercentage =
    activeRow && total
      ? Math.round((activeRow.value / total) * 100)
      : healthyPercentage;
  const centerColor = activeRow?.color ?? STATUS_COLORS.healthy;

  const status =
    stock.out > 0
      ? {
          icon: CircleAlert,
          text: `${formatNumber(stock.out)} ${countProductTerm(terminology, stock.out)} ${stock.out === 1 ? 'is' : 'are'} out of stock`,
          tone: 'critical' as const,
        }
      : stock.low > 0
        ? {
            icon: TriangleAlert,
            text: `${formatNumber(stock.low)} ${stock.low === 1 ? 'item needs' : 'items need'} attention`,
            tone: 'warning' as const,
          }
        : {
            icon: CircleCheck,
            text: `All tracked ${terminology.pluralLower} are in stock`,
            tone: 'healthy' as const,
          };

  return (
    <Card className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-dark-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.015em] text-[var(--dashboard-text)]">
            Inventory status
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-muted)]">
            {terminology.plural} available for sale right now.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
        >
          View all{' '}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {total > 0 ? (
        <div className="flex flex-1 flex-col px-5 py-3">
          <div className="grid flex-1 grid-cols-1 items-center gap-5 min-[420px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="flex min-w-0 flex-col items-center">
              <div
                className="relative h-[136px] w-[136px]"
                role="img"
                aria-label={`${healthyPercentage}% of ${total} tracked ${terminology.pluralLower} are in stock`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: 1 }]}
                      dataKey="value"
                      innerRadius="80%"
                      outerRadius="94%"
                      fill="var(--dashboard-surface-subtle)"
                      stroke="none"
                      isAnimationActive={false}
                    />
                    <Pie
                      data={rows}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="80%"
                      outerRadius="94%"
                      paddingAngle={2}
                      cornerRadius={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {rows.map((row) => (
                        <Cell
                          key={row.key}
                          fill={
                            activeIndex === null || activeIndex === row.index
                              ? row.color
                              : 'var(--dashboard-surface-subtle)'
                          }
                          opacity={
                            activeIndex === null || activeIndex === row.index
                              ? 1
                              : 0.3
                          }
                          style={{
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'opacity 150ms ease',
                          }}
                          onMouseEnter={() => setHoveredIndex(row.index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() =>
                            setSelectedIndex((selected) =>
                              selected === row.index ? null : row.index
                            )
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-xl font-bold tabular-nums transition-colors duration-150"
                    style={{ color: centerColor }}
                  >
                    {centerPercentage}%
                  </span>
                  <span
                    className="mt-0.5 max-w-[90px] truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-150"
                    style={{ color: centerColor }}
                  >
                    {activeRow?.label ?? 'In stock'}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[0.68rem] font-medium text-[var(--dashboard-muted)]">
                <span className="font-bold tabular-nums text-[var(--dashboard-text)]">
                  {formatNumber(total)}
                </span>{' '}
                {terminology.pluralLower} tracked
              </p>
            </div>

            <div className="min-w-0 space-y-1">
              {rows.map((row) => {
                const percentage = total
                  ? Math.round((row.value / total) * 100)
                  : 0;
                const percentageLabel =
                  row.value > 0 && percentage === 0 ? '<1%' : `${percentage}%`;
                const highlighted = activeIndex === row.index;
                return (
                  <button
                    type="button"
                    key={row.key}
                    aria-label={`${row.label}, ${row.value} ${terminology.pluralLower}, ${percentageLabel}`}
                    aria-pressed={selectedIndex === row.index}
                    onMouseEnter={() => setHoveredIndex(row.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(row.index)}
                    onBlur={() => setHoveredIndex(null)}
                    onClick={() =>
                      setSelectedIndex((selected) =>
                        selected === row.index ? null : row.index
                      )
                    }
                    className="group grid h-9 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-0 bg-transparent px-0 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span
                        className="truncate text-xs transition-colors duration-150"
                        style={{
                          color: highlighted
                            ? row.color
                            : 'var(--dashboard-text)',
                        }}
                      >
                        {row.label}
                      </span>
                    </span>
                    <span
                      className="min-w-[2rem] text-right text-xs font-bold tabular-nums transition-colors duration-150"
                      style={{
                        color: highlighted
                          ? row.color
                          : 'var(--dashboard-text)',
                      }}
                    >
                      {formatNumber(row.value)}
                    </span>
                    <span
                      className="min-w-[2.5rem] text-right text-[0.68rem] font-medium tabular-nums transition-colors duration-150"
                      style={{
                        color: highlighted
                          ? row.color
                          : 'var(--dashboard-muted)',
                      }}
                    >
                      {percentageLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2.5 border-t border-[var(--dashboard-border)] pt-2.5 text-xs font-semibold">
            <status.icon
              className={`h-4 w-4 shrink-0 ${
                status.tone === 'critical'
                  ? 'text-[#c97a72]'
                  : status.tone === 'warning'
                    ? 'text-[#dfae48]'
                    : 'text-[#48b78a]'
              }`}
            />
            <span
              className={
                status.tone === 'critical'
                  ? 'text-[#c97a72]'
                  : status.tone === 'warning'
                    ? 'text-[#dfae48]'
                    : 'text-[var(--dashboard-muted)]'
              }
            >
              {status.text}
            </span>
            {(status.tone === 'critical' || status.tone === 'warning') && (
              <Link
                href="/dashboard/inventory"
                className="ml-auto shrink-0 text-[var(--dashboard-muted)] transition-colors hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
              >
                Review stock →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]">
            <PackageOpen className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">
            No inventory data yet
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">
            Add {terminology.pluralLower} and stock levels to see inventory
            health.
          </p>
        </div>
      )}
    </Card>
  );
}
