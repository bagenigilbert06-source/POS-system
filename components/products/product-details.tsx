'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronLeft, ChevronRight, Edit3, Package } from 'lucide-react'
import type { Product } from '@/lib/db/schema'
import { formatCurrency } from '@/lib/utils'
import { getGrossMargin } from '@/lib/pricing/gross-margin'
import { StockHistoryChart } from './stock-history-chart'

type ProductOverview = {
  product: Product
  categoryName: string | null
  metrics: { unitsSoldToday: number; unitsSoldMonth: number; revenueMonth: number; grossProfitMonth: number; averageDailySales: number; stockValue: number; estimatedStockDays: number | null }
  movements: Array<{ id: string; type: string; quantity: number; stockBefore: number; stockAfter: number; reason: string | null; createdAt: Date }>
  purchases: Array<{ id: string; purchaseNo: string; supplierName: string; reference: string | null; receivedAt: Date; quantity: number; unitCost: string; totalCost: string }>
}

export function ProductDetails({ overview }: { overview: ProductOverview }) {
  const { product, categoryName, metrics, movements, purchases } = overview
  const buying = Number(product.buyingPrice)
  const selling = Number(product.sellingPrice)
  const profit = selling - buying
  const grossMargin = getGrossMargin(selling, buying)
  const status = !product.isActive ? 'Archived' : product.stock === 0 ? 'Out of stock' : product.stock <= product.minStock ? 'Low stock' : 'In stock'
  const stockHistory = [...movements].reverse().map((movement) => ({ date: movement.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), stock: movement.stockAfter }))

  return <div className="mx-auto max-w-[1100px] space-y-5 font-sans">
    <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
    <section className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-sm dark:border-slate-800 dark:bg-[#121212] dark:shadow-none"><div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[300px_1fr]">
      <div className="flex h-[280px] items-center justify-center overflow-hidden rounded-lg bg-[#fff8e8] text-[#8a6500] dark:bg-[#1b180d] dark:text-[#d6aa2d]">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} width={600} height={600} unoptimized className="h-full w-full object-cover" /> : <Package className="h-16 w-16" />}</div>
      <div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#9a6900] dark:text-[#d6aa2d]">{categoryName ?? 'Product'}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#101828] dark:text-slate-100">{product.name}</h1><p className="mt-2 text-sm text-muted-foreground">{product.sku ? `SKU ${product.sku}` : 'No SKU'}{product.barcode ? ` · Barcode ${product.barcode}` : ''}{product.unitsPerPack && product.unitsPerPack > 1 ? ` · Pack of ${product.unitsPerPack}` : ''}</p></div><span className="rounded-full border border-emerald-200 bg-[#edf7ef] px-3 py-1 text-xs font-medium text-[#28743c] dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-400">{status}</span></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><Metric label="Selling price" value={formatCurrency(selling)} /><Metric label="Cost price" value={formatCurrency(buying)} /><Metric label="Profit per unit" value={formatCurrency(profit)} /><Metric label="Current profit %" value={grossMargin.valid ? `${grossMargin.percent.toFixed(1)}%` : 'Check cost price'} /></div><p className="mt-3 text-xs text-muted-foreground">Profit % uses today&apos;s cost price. Sales reports show realized profit using the cost captured when each sale was completed.</p><div className="mt-6 flex flex-wrap gap-2"><Link href={`/dashboard/products/${product.id}?edit=true`} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Edit3 className="h-4 w-4" /> Edit product</Link></div></div>
    </div></section>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Available stock" value={`${product.stock} ${product.unit}`} /><Metric label="Units sold today" value={`${metrics.unitsSoldToday} ${product.unit}`} /><Metric label="Units sold this month" value={`${metrics.unitsSoldMonth} ${product.unit}`} /><Metric label="Revenue this month" value={formatCurrency(metrics.revenueMonth)} /><Metric label="Gross profit this month" value={formatCurrency(metrics.grossProfitMonth)} /><Metric label="Average daily sales" value={`${metrics.averageDailySales.toFixed(1)} ${product.unit}`} /><Metric label="Stock value" value={formatCurrency(metrics.stockValue)} /><Metric label="Estimated stock days" value={metrics.estimatedStockDays === null ? 'Not enough sales data' : `${metrics.estimatedStockDays.toFixed(0)} days`} /></section>
    <HistoryPanel title="Stock level"><StockHistoryChart data={stockHistory} unit={product.unit} alertLevel={product.minStock} /></HistoryPanel>
    <section className="grid items-start gap-5 lg:grid-cols-2">
      <HistoryPanel title="Recent stock movements">
        <PaginatedHistory
          items={movements}
          emptyText="No stock movements recorded yet."
          itemLabel="stock movements"
          renderItem={(movement) => <div key={movement.id} className="flex min-h-[70px] items-start justify-between gap-3 py-3 text-sm"><div><p className="font-medium capitalize">{movement.type.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{movement.reason || 'No reason supplied'} · {movement.createdAt.toLocaleDateString()}</p></div><div className="text-right"><p className={movement.quantity >= 0 ? 'font-semibold text-[#28743c]' : 'font-semibold text-destructive'}>{movement.quantity >= 0 ? '+' : ''}{movement.quantity}</p><p className="text-xs text-muted-foreground">{movement.stockBefore} → {movement.stockAfter}</p></div></div>}
        />
      </HistoryPanel>
      <HistoryPanel title="Recent purchases">
        <PaginatedHistory
          items={purchases}
          emptyText="No purchases recorded yet."
          itemLabel="purchases"
          renderItem={(purchase) => <div key={purchase.id} className="flex min-h-[70px] items-start justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{purchase.supplierName}</p><p className="mt-1 text-xs text-muted-foreground">{purchase.purchaseNo} · {purchase.receivedAt.toLocaleDateString()}</p></div><div className="text-right"><p className="font-semibold">{purchase.quantity} {product.unit}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(purchase.unitCost))} each</p></div></div>}
        />
      </HistoryPanel>
    </section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-[#fafbfc] p-4 dark:border-slate-800 dark:bg-[#151515]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#101828] dark:text-slate-100">{value}</p></div> }
function HistoryPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-[#121212]"><h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2><div className="mt-3">{children}</div></section> }
function EmptyHistory({ text }: { text: string }) { return <p className="py-5 text-sm text-muted-foreground">{text}</p> }

const HISTORY_PAGE_SIZE = 6

function PaginatedHistory<T>({ items, emptyText, itemLabel, renderItem }: {
  items: T[]
  emptyText: string
  itemLabel: string
  renderItem: (item: T) => React.ReactNode
}) {
  const [page, setPage] = useState(1)
  if (!items.length) return <EmptyHistory text={emptyText} />

  const pageCount = Math.ceil(items.length / HISTORY_PAGE_SIZE)
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * HISTORY_PAGE_SIZE
  const end = Math.min(start + HISTORY_PAGE_SIZE, items.length)

  return <div>
    <div className="divide-y dark:divide-slate-800">{items.slice(start, end).map(renderItem)}</div>
    {pageCount > 1 && <nav className="mt-3 flex items-center justify-between border-t pt-3 dark:border-slate-800" aria-label={`${itemLabel} pagination`}>
      <p className="text-xs tabular-nums text-muted-foreground">{start + 1}–{end} of {items.length}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">Page {currentPage} of {pageCount}</span>
        <div className="inline-flex overflow-hidden rounded-lg border bg-background shadow-sm dark:border-slate-700">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35" aria-label={`Previous ${itemLabel} page`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="inline-flex h-8 w-8 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35 dark:border-slate-700" aria-label={`Next ${itemLabel} page`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
    </nav>}
  </div>
}
