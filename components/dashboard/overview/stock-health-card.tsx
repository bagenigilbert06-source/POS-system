'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CircleAlert, CircleCheck, PackageOpen, TriangleAlert } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/utils/format'

interface StockHealthCardProps {
  stock: { healthy: number; low: number; out: number }
}

const STATUS_COLORS = {
  healthy: '#2f8f63',
  low: '#d6a02e',
  out: '#c9564a',
}

export function StockHealthCard({ stock }: StockHealthCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const rows = useMemo(
    () => [
      { key: 'healthy', label: 'In stock', value: Math.max(stock.healthy, 0), color: STATUS_COLORS.healthy },
      { key: 'low', label: 'Low stock', value: Math.max(stock.low, 0), color: STATUS_COLORS.low },
      { key: 'out', label: 'Out of stock', value: Math.max(stock.out, 0), color: STATUS_COLORS.out },
    ].map((row, index) => ({ ...row, index })),
    [stock.healthy, stock.low, stock.out],
  )
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const healthyPercentage = total ? Math.round((rows[0].value / total) * 100) : 0
  const activeRow = activeIndex === null ? undefined : rows[activeIndex]
  const centerPercentage = activeRow && total ? Math.round((activeRow.value / total) * 100) : healthyPercentage

  const status = stock.out > 0
    ? { icon: CircleAlert, text: `${formatNumber(stock.out)} ${stock.out === 1 ? 'product is' : 'products are'} out of stock`, tone: 'critical' as const }
    : stock.low > 0
      ? { icon: TriangleAlert, text: `${formatNumber(stock.low)} ${stock.low === 1 ? 'item needs' : 'items need'} attention`, tone: 'warning' as const }
      : { icon: CircleCheck, text: 'All tracked products are in stock', tone: 'healthy' as const }

  return (
    <Card className="flex min-h-[354px] flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--dashboard-border)] px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-bold tracking-tight text-[var(--dashboard-text)]">Inventory status</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-muted)]">Products available for sale right now.</p>
        </div>
        <Link href="/dashboard/inventory" className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:text-[var(--dashboard-accent)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {total > 0 ? (
        <div className="flex flex-1 flex-col px-4 py-4">
          <div className="grid flex-1 grid-cols-1 items-center gap-4 min-[420px]:grid-cols-[170px_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col items-center">
              <div className="relative h-[156px] w-[156px]" role="img" aria-label={`${healthyPercentage}% of ${total} tracked products are in stock`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rows} dataKey="value" nameKey="label" innerRadius="72%" outerRadius="96%" paddingAngle={2.5} cornerRadius={4} stroke="none" isAnimationActive={false}>
                      {rows.map((row) => (
                        <Cell
                          key={row.key}
                          fill={row.color}
                          opacity={activeIndex === null || activeIndex === row.index ? 1 : 0.3}
                          style={{ cursor: 'pointer', outline: 'none', transition: 'opacity 150ms ease' }}
                          onMouseEnter={() => setActiveIndex(row.index)}
                          onMouseLeave={() => setActiveIndex(null)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums text-[var(--dashboard-text)]">{centerPercentage}%</span>
                  <span className="mt-0.5 max-w-[90px] truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--dashboard-muted)]">{activeRow?.label ?? 'In stock'}</span>
                </div>
              </div>
              <p className="mt-1 text-[0.68rem] font-medium text-[var(--dashboard-muted)]"><span className="font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(total)}</span> products tracked</p>
            </div>

            <div className="min-w-0 space-y-1">
              {rows.map((row) => {
                const percentage = total ? Math.round((row.value / total) * 100) : 0
                const active = activeIndex === row.index
                return (
                  <div
                    key={row.key}
                    tabIndex={0}
                    aria-label={`${row.label}, ${row.value} products, ${percentage}%`}
                    onMouseEnter={() => setActiveIndex(row.index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(row.index)}
                    onBlur={() => setActiveIndex(null)}
                    className={`grid grid-cols-[minmax(0,1fr)_2rem_2.5rem] items-center gap-2 rounded-lg px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)] ${active ? 'bg-[var(--dashboard-surface-subtle)]' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="truncate text-xs font-semibold text-[var(--dashboard-text)]">{row.label}</span>
                    </span>
                    <span className="text-right text-xs font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(row.value)}</span>
                    <span className="text-right text-[0.68rem] font-medium tabular-nums text-[var(--dashboard-muted)]">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={`mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-semibold ${
            status.tone === 'critical'
              ? 'border-[#c9564a]/30 bg-[#c9564a]/10 text-[#e06b5f]'
              : status.tone === 'warning'
                ? 'border-[#d6a02e]/30 bg-[#d6a02e]/10 text-[#d6a02e]'
                : 'border-[#2f8f63]/30 bg-[#2f8f63]/10 text-[#3aa474]'
          }`}>
            <status.icon className="h-4 w-4 shrink-0" />
            <span>{status.text}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><PackageOpen className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">No inventory data yet</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">Add products and stock levels to see inventory health.</p>
        </div>
      )}
    </Card>
  )
}
