'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowRight, BarChart3, PackageOpen, WalletCards } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

type Payment = { method: string; amount: number; transactions: number }
type Product = { name: string; quantity: number; revenue: number }

interface DashboardInsightChartsProps {
  currency: string
  paymentMix: Payment[]
  topProducts: Product[]
  stock: { healthy: number; low: number; out: number }
  productLabel?: string
}

// Warm, understated palette that matches the dashboard's design tokens.
// Red is reserved for genuine errors/stock-outs, never used as a general data color.
const PAYMENT_COLORS = ['#c99a2e', '#2f8f63', '#3b6fa8', '#8a7ba8', '#9aa2ad']
const STOCK_COLORS = { healthy: '#2f8f63', low: '#d6a02e', out: '#c9564a' }
const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', color: PAYMENT_COLORS[0] },
  { key: 'mpesa', label: 'M-Pesa', color: PAYMENT_COLORS[1] },
  { key: 'card', label: 'Card', color: PAYMENT_COLORS[2] },
  { key: 'bank_transfer', label: 'Bank transfer', color: PAYMENT_COLORS[3] },
]

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid var(--dashboard-border)',
  background: 'var(--dashboard-chart-tooltip)',
  boxShadow: '0 8px 20px rgba(16,24,40,.08)',
  fontSize: 12,
  padding: '8px 12px',
}

const label = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function compactCurrency(value: number, currency: string) {
  const symbols: Record<string, string> = { KES: 'KES', USD: '$', EUR: '€', GBP: '£', UGX: 'USh', TZS: 'TSh', RWF: 'RF' }
  const absolute = Math.abs(value)
  const scale = absolute >= 1_000_000 ? { divisor: 1_000_000, suffix: 'M' } : absolute >= 1_000 ? { divisor: 1_000, suffix: 'K' } : { divisor: 1, suffix: '' }
  const amount = value / scale.divisor
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, '')
  return `${symbols[currency] ?? currency} ${formatted}${scale.suffix}`
}

function ChartCard({
  title,
  description,
  href,
  className,
  children,
}: {
  title: string
  description: string
  href?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.04)] ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--dashboard-border)] px-5 py-3.5">
        <div>
          <h2 className="text-[0.95rem] font-bold tracking-tight text-[var(--dashboard-text)]">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">{description}</p>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:text-[#a47700]"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 items-center px-4 py-3.5 [&>*]:w-full">{children}</div>
    </article>
  )
}

function EmptyChart({
  icon: Icon,
  title,
  detail,
  href,
}: {
  icon: typeof BarChart3
  title: string
  detail: string
  href: string
}) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">{detail}</p>
      <Link href={href} className="mt-3 text-xs font-semibold text-[#a47700] hover:underline">
        Get started
      </Link>
    </div>
  )
}

/**
 * Legend row shared by the two donut charts. Default state is quiet — swatch,
 * name, share% — and the exact value reveals only on hover/focus, so the row
 * stays clean until someone actually wants the number. `isActive`/`onHover`
 * let this row and its donut segment highlight together.
 */
function LegendRow({
  color,
  name,
  valueLabel,
  percentLabel,
  isActive,
  onHover,
}: {
  color: string
  name: string
  valueLabel: string
  percentLabel: string
  isActive: boolean
  onHover: (hovering: boolean) => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c99a2e]/40 ${
        isActive ? 'bg-[var(--dashboard-surface-subtle)]' : ''
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-[var(--dashboard-text)]">{name}</span>
          <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--dashboard-text)]">{percentLabel}</span>
        </span>
        <span
          className={`block overflow-hidden text-[0.68rem] tabular-nums text-[var(--dashboard-muted)] transition-all duration-150 ${
            isActive ? 'mt-0.5 max-h-4 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {valueLabel}
        </span>
      </span>
    </button>
  )
}

/** Single row in the Top products list: rank, name, proportional bar, value. Deliberately not a Recharts chart — full control over truncation and bar proportion avoids label wrap and scale-mismatch bugs. */
function ProductBarRow({
  rank,
  name,
  value,
  valueLabel,
  quantity,
  share,
}: {
  rank: number
  name: string
  value: number
  valueLabel: string
  quantity: number
  share: number
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-[var(--dashboard-surface-subtle)]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--dashboard-surface-subtle)] text-[0.6rem] font-bold tabular-nums text-[var(--dashboard-muted)]">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span title={name} className="truncate text-xs font-semibold text-[var(--dashboard-text)]">{name} <span className="font-normal text-[0.65rem] text-[var(--dashboard-muted)]">· {quantity} sold</span></span>
          <span className="shrink-0 text-[0.7rem] font-bold tabular-nums text-[var(--dashboard-text)]">{valueLabel}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dashboard-surface-subtle)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#c99a2e] to-[#f1c75b] transition-[width]" style={{ width: `${Math.max(share, value > 0 ? 3 : 0)}%` }} />
        </div>
      </div>
    </div>
  )
}

export function DashboardInsightCharts({
  currency,
  paymentMix,
  topProducts,
  stock,
  productLabel = 'products',
}: DashboardInsightChartsProps) {
  const [paymentActive, setPaymentActive] = useState<number | null>(null)

  const paymentRows = new Map(paymentMix.map((item) => [item.method.toLowerCase().replace(/[- ]/g, '_'), item]))
  const payments = PAYMENT_METHODS.map((method, index) => {
    const item = paymentRows.get(method.key)
    return {
      method: method.key,
      amount: item?.amount ?? 0,
      transactions: item?.transactions ?? 0,
      index,
      label: method.label,
      color: method.color,
    }
  })
  const paymentTotal = payments.reduce((sum, item) => sum + item.amount, 0)
  const visiblePayments = payments

  const products = topProducts.slice(0, 6)
  const maxProductRevenue = products.reduce((max, item) => Math.max(max, item.revenue), 0)

  const stockData = [
    { name: 'Healthy', value: Math.max(stock.healthy, 0), color: STOCK_COLORS.healthy },
    { name: 'Low', value: stock.low, color: STOCK_COLORS.low },
    { name: 'Out', value: stock.out, color: STOCK_COLORS.out },
  ].map((item, index) => ({ ...item, index }))
  const stockTotal = stockData.reduce((sum, item) => sum + item.value, 0)

  return (
    <section aria-label="Business insight charts" className="grid gap-4 xl:grid-cols-3">
      <ChartCard title="Payment mix" description="Sales value by payment method this month." href="/dashboard/reports">
        {paymentMix.length ? (
          <div className="grid grid-cols-1 items-center gap-4 min-[420px]:grid-cols-[180px_minmax(0,1fr)] min-[420px]:gap-3">
            <div className="relative mx-auto flex h-[180px] w-[180px] min-w-0 items-center justify-center min-[420px]:mx-0 min-[420px]:w-full">
              <PieChart width={180} height={180}>
                  <Pie
                    data={payments}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius="70%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {payments.map((item) => (
                      <Cell
                        key={item.method}
                        fill={item.color}
                        opacity={paymentActive === null || paymentActive === item.index ? 1 : 0.35}
                        style={{ cursor: 'pointer', transition: 'opacity 150ms ease' }}
                        onMouseEnter={() => setPaymentActive(item.index)}
                        onMouseLeave={() => setPaymentActive(null)}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Total</span>
                <span className="text-sm font-bold tabular-nums text-[var(--dashboard-text)]">
                  {compactCurrency(paymentTotal, currency)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {visiblePayments.map((item) => (
                <LegendRow
                  key={item.method}
                  color={item.color}
                  name={item.label}
                  valueLabel={`${formatCurrency(item.amount, currency)} · ${item.transactions} sales`}
                  percentLabel={paymentTotal ? `${Math.round((item.amount / paymentTotal) * 100)}%` : '0%'}
                  isActive={paymentActive === item.index}
                  onHover={(hovering) => setPaymentActive(hovering ? item.index : null)}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart
            icon={WalletCards}
            title="No payment data yet"
            detail="Cash, M-Pesa, card and bank sales will be compared here."
            href="/dashboard/pos"
          />
        )}
      </ChartCard>

      <ChartCard title={`Top ${productLabel}`} description="Best sellers by revenue this month." href="/dashboard/reports">
        {products.length ? (
          <div className="w-full space-y-1.5 py-1">
            <div className="mb-2 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--dashboard-muted)]">
              <span>{products.length} best sellers</span>
              <span className="text-[var(--dashboard-success)]">Live this month</span>
            </div>
            {products.map((item, index) => (
              <ProductBarRow
                key={item.name}
                rank={index + 1}
                name={item.name}
                value={item.revenue}
                valueLabel={formatCurrency(item.revenue, currency)}
                quantity={item.quantity}
                share={maxProductRevenue ? (item.revenue / maxProductRevenue) * 100 : 0}
              />
            ))}
          </div>
        ) : (
          <EmptyChart
            icon={BarChart3}
            title="No product ranking yet"
            detail={`Your fastest-moving ${productLabel} will appear after completed sales.`}
            href="/dashboard/pos"
          />
        )}
      </ChartCard>

      <ChartCard title="Stock health" description="Active catalogue availability right now." href="/dashboard/inventory">
        {stockData.length ? (
          <>
          <div className="grid min-h-[210px] grid-cols-[210px_minmax(0,1fr)] items-center gap-4 max-md:grid-cols-[170px_minmax(0,1fr)]">
          <div className="relative flex h-[210px] w-[210px] items-center justify-center max-md:h-[170px] max-md:w-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none" isAnimationActive={false}>
                  {stockData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${formatNumber(Number(value))} items`, 'Stock']} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute flex flex-col items-center justify-center">
              <span className="text-[0.62rem] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Items</span>
              <span className="text-lg font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(stock.healthy + stock.low + stock.out)}</span>
            </div>
          </div>
          <div className="space-y-1">
            {stockData.map((item) => (
              <LegendRow key={item.name} color={item.color} name={item.name} valueLabel={`${formatNumber(item.value)} items`} percentLabel={stockTotal ? `${Math.round((item.value / stockTotal) * 100)}%` : '0%'} isActive={false} onHover={() => undefined} />
            ))}
          </div>
          </div>
          </>
        ) : (
          <EmptyChart
            icon={PackageOpen}
            title="Catalogue is empty"
            detail={`Add your first ${productLabel} and opening stock to activate inventory health.`}
            href="/dashboard/products"
          />
        )}
      </ChartCard>
    </section>
  )
}
