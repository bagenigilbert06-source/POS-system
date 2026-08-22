'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

type Period = 1 | 7 | 30

interface ProductSale {
  date: string
  productId: string
  name: string
  imageUrl: string | null
  quantity: number
  revenue: number
}

interface TopSellingProductsCardProps {
  currency: string
  reportDate: string
  sales: ProductSale[]
}

function startDate(reportDate: string, period: Period) {
  const date = new Date(`${reportDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - period + 1)
  return date.toISOString().slice(0, 10)
}

export function TopSellingProductsCard({ currency, reportDate, sales }: TopSellingProductsCardProps) {
  const [period, setPeriod] = useState<Period>(30)
  const [periodOpen, setPeriodOpen] = useState(false)
  const products = useMemo(() => {
    const from = startDate(reportDate, period)
    const totals = new Map<string, { productId: string; name: string; imageUrl: string | null; quantity: number; revenue: number }>()

    for (const sale of sales) {
      if (sale.date < from || sale.date > reportDate) continue
      const current = totals.get(sale.productId) ?? { productId: sale.productId, name: sale.name, imageUrl: sale.imageUrl, quantity: 0, revenue: 0 }
      current.quantity += sale.quantity
      current.revenue += sale.revenue
      if (!current.imageUrl && sale.imageUrl) current.imageUrl = sale.imageUrl
      totals.set(sale.productId, current)
    }

    return [...totals.values()]
      .filter((product) => product.quantity > 0 || product.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity || a.name.localeCompare(b.name))
      .slice(0, 5)
  }, [period, reportDate, sales])

  const maxPerformance = Math.max(1, ...products.map((product) => product.revenue || product.quantity))

  return (
    <article className="flex h-full min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">Top selling products</h2>
          <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">Best performers by completed sales.</p>
        </div>
        <label className="sr-only" htmlFor="top-products-period">Top products period</label>
        <div className="relative shrink-0">
          <button type="button" aria-haspopup="listbox" aria-expanded={periodOpen} aria-label="Top products period" onClick={() => setPeriodOpen((open) => !open)} className="flex h-9 min-w-[88px] items-center justify-between gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2.5 text-[0.7rem] font-semibold text-[var(--dashboard-text)] outline-none transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] focus:border-transparent focus:ring-0">
            {period === 1 ? 'Today' : period === 7 ? '7 days' : '30 days'}<span className="text-[var(--dashboard-muted)]">⌄</span>
          </button>
          {periodOpen && <div role="listbox" className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1 shadow-lg">
            {[{ value: 1 as Period, label: 'Today' }, { value: 7 as Period, label: '7 days' }, { value: 30 as Period, label: '30 days' }].map((option) => <button key={option.value} type="button" role="option" aria-selected={period === option.value} onClick={() => { setPeriod(option.value); setPeriodOpen(false) }} className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-[var(--dashboard-text)] outline-none hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus:bg-[var(--dashboard-accent-soft)] focus:text-[var(--dashboard-accent)]">{option.label}</button>)}
          </div>}
        </div>
      </header>

      {products.length ? (
        <div className="flex flex-1 flex-col px-5 py-2">
          {products.map((product, index) => {
            const performance = ((product.revenue || product.quantity) / maxPerformance) * 100
            return (
              <div key={product.productId} className="grid flex-1 grid-cols-[1.25rem_2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--dashboard-border)] py-2.5 last:border-b-0">
                <span className={cn('text-center text-[0.68rem] font-bold tabular-nums', index === 0 ? 'text-[var(--dashboard-accent)]' : 'text-[var(--dashboard-muted)]')}>{index + 1}</span>
                <span className="relative flex h-9 w-9 overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)]">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt="" fill sizes="36px" unoptimized className="object-cover" />
                  ) : (
                    <Package className="m-auto h-4 w-4 text-[var(--dashboard-muted)]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-[var(--dashboard-text)]" title={product.name}>{product.name}</p>
                  </div>
                  <p className="mt-0.5 text-[0.66rem] text-[var(--dashboard-muted)]">{formatNumber(product.quantity)} units sold</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--dashboard-surface-subtle)]">
                    <div className={cn('h-full rounded-full bg-[var(--dashboard-accent)]', index !== 0 && 'opacity-60')} style={{ width: `${Math.max(4, performance)}%` }} />
                  </div>
                </div>
                <p className="pl-1 text-right text-xs font-bold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(product.revenue, currency)}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]">
            <Package className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-[var(--dashboard-text)]">No product sales yet</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-5 text-[var(--dashboard-muted)]">Top-selling products will appear as completed sales are recorded.</p>
        </div>
      )}

      <Link href="/dashboard/products" className="mx-5 mb-4 mt-2 flex h-9 items-center justify-between rounded-lg border border-[var(--dashboard-border)] px-3 text-xs font-semibold text-[var(--dashboard-text)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]">
        View products <ArrowRight className="h-3.5 w-3.5 text-[var(--dashboard-accent)]" aria-hidden="true" />
      </Link>
    </article>
  )
}
