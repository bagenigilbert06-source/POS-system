import Link from 'next/link'
import { ArrowRight, ChefHat, ClipboardList, Coffee, CreditCard, ListFilter, ReceiptText, Search, UtensilsCrossed } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { getCafeOrdersData } from '@/app/actions/cafe'

type Rows = Awaited<ReturnType<typeof getCafeOrdersData>>
type Filters = { search?: string; status?: string; orderType?: string; payment?: string }

const field = 'h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm text-[#344054] outline-none transition-colors focus:border-[#f9b21d] focus:ring-2 focus:ring-[#f9b21d]/20 dark:border-white/10 dark:bg-[#171717] dark:text-[#f2f4f7]'

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function StatusBadge({ value, tone = 'slate' }: { value: string; tone?: 'slate' | 'amber' | 'blue' | 'green' }) {
  const classes = tone === 'green'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300'
    : tone === 'blue'
      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-300'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>{label(value)}</span>
}

function preparationTone(value: string): 'slate' | 'amber' | 'blue' | 'green' {
  if (value === 'ready' || value === 'completed') return 'green'
  if (value === 'preparing') return 'blue'
  if (value === 'new') return 'amber'
  return 'slate'
}

function orderTone(value: string): 'slate' | 'amber' | 'blue' | 'green' {
  if (value === 'completed') return 'green'
  if (value === 'open' || value === 'awaiting_payment') return 'amber'
  return 'slate'
}

function Metric({ label: title, value, detail, icon: Icon, tone = 'gold' }: { label: string; value: string | number; detail: string; icon: typeof ReceiptText; tone?: 'gold' | 'blue' | 'green' }) {
  const iconClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : tone === 'blue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-[#fff4cf] text-[#9a6500] dark:bg-[#392d0a] dark:text-[#f4c64b]'
  return <section className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#667085] dark:text-[#a8a8a8]">{title}</p><p className="mt-2 text-2xl font-extrabold tracking-[-.03em] tabular-nums">{value}</p><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">{detail}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg ${iconClass}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span></div></section>
}

export function CafeOrdersView({ rows, filters }: { rows: Rows; filters: Filters }) {
  const paidOrders = rows.filter((row) => Boolean(row.paymentMethod && row.total))
  const activeOrders = rows.filter((row) => !['completed', 'cancelled'].includes(row.order.status))
  const preparationOrders = rows.filter((row) => ['new', 'preparing', 'ready'].includes(row.order.preparationStatus))
  const collected = paidOrders.reduce((total, row) => total + Number(row.total ?? 0), 0)
  const average = paidOrders.length ? collected / paidOrders.length : 0
  const filtersApplied = Boolean(filters.search || filters.status || filters.orderType || filters.payment)

  return <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f1d47d] bg-[#fff5d8] text-[#9a6500] dark:border-[#5b4612] dark:bg-[#2b220c] dark:text-[#f4c64b]"><ReceiptText className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#b17b00]">Café operations</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-.025em]">Orders</h1><p className="mt-1 text-sm text-[#667085] dark:text-[#a8a8a8]">Track today’s counter orders, guest service and preparation progress.</p></div></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/cafe/preparation" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3.5 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#171717] dark:text-[#f2f4f7] dark:hover:bg-white/10"><ChefHat className="h-4 w-4" />Preparation board</Link><Link href="/dashboard/pos" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f9b21d] px-4 text-sm font-extrabold text-[#241d00] transition-colors hover:bg-[#e6a30f]"><Coffee className="h-4 w-4" />New order<ArrowRight className="h-4 w-4" /></Link></div></header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Orders today" value={rows.length} detail={filtersApplied ? 'Matching current filters' : 'All recorded today'} icon={ReceiptText} /><Metric label="Open orders" value={activeOrders.length} detail="Need payment or completion" icon={ClipboardList} tone="blue" /><Metric label="In preparation" value={preparationOrders.length} detail="New, preparing or ready" icon={ChefHat} tone="green" /><Metric label="Collected today" value={formatCurrency(collected)} detail={paidOrders.length ? `Average ${formatCurrency(average)} per paid order` : 'No paid orders recorded'} icon={CreditCard} /></div>

    <section className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Find an order</h2><p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">Search by order number or receipt, then narrow the operational view.</p></div>{filtersApplied && <Link href="/dashboard/sales" className="text-xs font-semibold text-[#9a6500] hover:text-[#714b00] dark:text-[#f4c64b]">Clear filters</Link>}</div><form className="flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" /><input name="search" defaultValue={filters.search} placeholder="Order # or receipt" className={`${field} w-full pl-9`} /></label><select name="status" defaultValue={filters.status ?? ''} className={field}><option value="">All statuses</option><option value="completed">Completed</option><option value="open">Open</option><option value="awaiting_payment">Awaiting payment</option><option value="cancelled">Cancelled</option></select><select name="orderType" defaultValue={filters.orderType ?? ''} className={field}><option value="">All types</option><option value="takeaway">Takeaway</option><option value="dine_in">Dine-in</option><option value="delivery">Delivery</option></select><select name="payment" defaultValue={filters.payment ?? ''} className={field}><option value="">All payments</option><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="card">Card</option></select><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f9b21d] px-4 text-sm font-extrabold text-[#241d00] transition-colors hover:bg-[#e6a30f]"><ListFilter className="h-4 w-4" />Apply</button></form></section>

    <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]"><div className="flex items-center justify-between border-b border-[#eef0f3] px-4 py-3 dark:border-white/10"><div><h2 className="text-sm font-bold">Today’s orders</h2><p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">{rows.length} {rows.length === 1 ? 'order' : 'orders'} shown</p></div><Link href="/dashboard/cafe/preparation" className="text-xs font-semibold text-[#9a6500] hover:text-[#714b00] dark:text-[#f4c64b]">Open queue →</Link></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#667085] dark:bg-white/5"><tr>{['Order','Time','Type','Guest / table','Items','Total','Payment','Preparation','Cashier','Status'].map((column) => <th key={column} className="px-4 py-3 font-semibold">{column}</th>)}</tr></thead><tbody className="divide-y divide-[#eef0f3] dark:divide-white/10">{rows.map((row) => <tr key={row.order.id} className="transition-colors hover:bg-[#fffaf0] dark:hover:bg-white/5"><td className="px-4 py-3"><Link href={`/dashboard/cafe/orders/${row.order.id}`} className="font-extrabold text-[#8a6200] hover:underline dark:text-[#ffd166]">#{row.order.orderNumber}</Link><p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#a8a8a8]">{row.receiptNo || 'Unpaid order'}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs text-[#667085] dark:text-[#a8a8a8]">{formatDateTime(row.order.createdAt)}</td><td className="px-4 py-3 font-medium">{label(row.order.orderType)}</td><td className="px-4 py-3"><p className="font-medium">{row.tableName || 'Walk-in guest'}</p><p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#a8a8a8]">{row.branchName}</p></td><td className="px-4 py-3 font-semibold tabular-nums">{row.itemCount}</td><td className="px-4 py-3 font-bold tabular-nums">{row.total ? formatCurrency(row.total) : '—'}</td><td className="px-4 py-3">{row.paymentMethod ? <StatusBadge value={row.paymentMethod} tone="green" /> : <StatusBadge value="Pending" tone="amber" />}</td><td className="px-4 py-3"><StatusBadge value={row.order.preparationStatus} tone={preparationTone(row.order.preparationStatus)} /></td><td className="px-4 py-3 text-[#475467] dark:text-[#d0d5dd]">{row.cashierName || '—'}</td><td className="px-4 py-3"><StatusBadge value={row.order.status} tone={orderTone(row.order.status)} /></td></tr>)}</tbody></table></div> : <div className="grid min-h-[330px] place-items-center p-8 text-center"><div className="max-w-md"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff4cf] text-[#9a6500] dark:bg-[#392d0a] dark:text-[#f4c64b]"><UtensilsCrossed className="h-6 w-6" /></span><h3 className="mt-4 text-lg font-extrabold">{filtersApplied ? 'No orders match these filters' : 'No café orders yet'}</h3><p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#a8a8a8]">{filtersApplied ? 'Clear or adjust the filters to see today’s orders.' : 'Create a counter order to start tracking payments, guests and preparation progress here.'}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{filtersApplied && <Link href="/dashboard/sales" className="inline-flex h-10 items-center rounded-lg border border-[#d0d5dd] bg-white px-4 text-sm font-semibold dark:border-white/10 dark:bg-[#171717]">Clear filters</Link>}<Link href="/dashboard/pos" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f9b21d] px-4 text-sm font-extrabold text-[#241d00] hover:bg-[#e6a30f]"><Coffee className="h-4 w-4" />Open Counter POS</Link></div></div></div>}</section>
  </div>
}
