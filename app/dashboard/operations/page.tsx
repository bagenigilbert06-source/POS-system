import Link from 'next/link'
import type { ElementType } from 'react'
import { AlertTriangle, ArrowRight, Banknote, Boxes, CircleCheck, ClipboardCheck, ReceiptText, ShoppingBag } from 'lucide-react'
import { getOperationsData } from '@/app/actions/operations'
import { TimeGreeting } from '@/components/dashboard/time-greeting'
import { OperationsControl } from '@/components/operations/operations-control'
import { getCurrentSession } from '@/lib/auth'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'

export default async function OperationsPage() {
  const [{ organization }, session] = await Promise.all([requireWorkspaceModule('pos'), getCurrentSession()])
  const timeZone = organization.timezone || 'Africa/Nairobi'
  const data = await getOperationsData(timeZone)
  const generatedAt = new Date()
  const salesTotal = Number(data.summary.salesToday.total)
  const refundTotal = Number(data.summary.refundsToday.total)
  const lossQuantity = Number(data.summary.lossesToday.quantity)
  const openCount = data.openSessions.length

  const metrics = [
    { label: 'Open registers', value: formatNumber(openCount), detail: openCount ? `${openCount} shift${openCount === 1 ? '' : 's'} awaiting reconciliation` : 'No register is currently open', icon: Banknote, tone: openCount ? 'positive' : 'warning', href: '#supervisor-actions' },
    { label: "Today's sales", value: formatCurrency(salesTotal, organization.currency), detail: `${formatNumber(Number(data.summary.salesToday.count))} completed receipts`, icon: ReceiptText, tone: 'positive', href: '/dashboard/sales' },
    { label: 'Refunds today', value: formatCurrency(refundTotal, organization.currency), detail: `${formatNumber(Number(data.summary.refundsToday.count))} credit notes issued`, icon: AlertTriangle, tone: refundTotal ? 'warning' : 'positive', href: '#recent-credit-notes' },
    { label: 'Stock lost today', value: `${formatNumber(lossQuantity)} units`, detail: `${formatNumber(Number(data.summary.lossesToday.count))} loss records · ${formatCurrency(Number(data.summary.lossesToday.totalCost), organization.currency)}`, icon: Boxes, tone: lossQuantity ? 'warning' : 'positive', href: '#recent-stock-losses' },
  ] as const

  const updatedAt = generatedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone })

  return <div className="dashboard-overview mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <header className="dashboard-welcome flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="dashboard-live-status"><i /> Live operations</span>
          <span className="dashboard-updated">Updated {updatedAt}</span>
        </div>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#9a6700] dark:text-[#ffd60a]">Supervisor workspace · {organization.name}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"><TimeGreeting name={session?.user.name} timeZone={timeZone} /></h1>
        <p className="mt-2 text-sm">Here&apos;s what needs your attention across registers, refunds and inventory today.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/pos" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ffd60a] px-5 text-sm font-semibold text-[#0b0b0d] shadow-sm transition-colors hover:bg-[#ffdf3a]"><ShoppingBag className="h-4 w-4" />Point of sale</Link>
        <Link href="/dashboard/sales" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-colors"><ReceiptText className="h-4 w-4" />View sales</Link>
      </div>
    </header>

    <section aria-label="Today's supervisor overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
    </section>

    {!openCount && <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /></span><div><h2 className="text-sm font-bold">No register is open</h2><p className="mt-1 text-xs leading-5 opacity-80">Open a register before counter sales begin so cash activity can be reconciled correctly.</p></div></div>
      <Link href="#supervisor-actions" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold">Open register <ArrowRight className="h-3.5 w-3.5" /></Link>
    </section>}

    <OperationsControl products={data.products} sales={data.sales} openSessions={data.openSessions} />

    <section aria-labelledby="recent-activity-title">
      <div className="mb-3"><p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#9a6700] dark:text-[#ffd60a]">Audit trail</p><h2 id="recent-activity-title" className="mt-1 text-lg font-bold tracking-tight text-[#172033] dark:text-[#f5f5f7]">Recent operational activity</h2></div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <History id="recent-registers" icon={Banknote} title="Register sessions" empty="No register sessions yet." rows={data.sessions.slice(0, 8).map((record) => ({ title: record.sessionNo, detail: `${formatDateTime(record.openedAt)}${record.closedAt ? ` · Closed ${formatDateTime(record.closedAt)}` : ''}`, value: record.status === 'closed' ? `Variance ${formatCurrency(Number(record.variance || 0), organization.currency)}` : `Opening ${formatCurrency(Number(record.openingCash), organization.currency)}`, status: record.status }))} />
        <History id="recent-credit-notes" icon={ReceiptText} title="Credit notes" empty="No refunds have been issued." rows={data.returns.slice(0, 8).map((record) => ({ title: record.returnNo, detail: `${record.receiptNo} · ${record.reason}`, value: formatCurrency(Number(record.amount), organization.currency), status: 'refunded' }))} />
        <History id="recent-stock-losses" icon={Boxes} title="Inventory losses" empty="No inventory losses recorded." rows={data.losses.slice(0, 8).map((record) => ({ title: record.productName, detail: `${record.type.replace('_', ' ')} · ${formatNumber(record.quantity)} units · ${record.reason}`, value: formatCurrency(Number(record.totalCost), organization.currency), status: record.type }))} />
      </div>
    </section>
  </div>
}

function MetricCard({ label, value, detail, icon: Icon, tone, href }: { label: string; value: string; detail: string; icon: ElementType; tone: 'positive' | 'warning'; href: string }) {
  return <Link href={href} className={`dashboard-metric-card ${tone === 'warning' ? 'metric-alert' : 'metric-positive'} group rounded-xl border px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-[#d6a800]`}>
    <div className="flex items-start justify-between gap-3"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><span className={tone === 'warning' ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}><Icon className="h-4 w-4" /></span></div>
    <p className="mt-3 truncate text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    <div className="mt-auto flex items-end justify-between gap-3 pt-2"><p className="text-xs text-muted-foreground">{detail}</p><ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
  </Link>
}

function History({ id, icon: Icon, title, empty, rows }: { id: string; icon: ElementType; title: string; empty: string; rows: { title: string; detail: string; value: string; status: string }[] }) {
  return <article id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-[0_4px_14px_rgba(16,24,40,.05)] dark:bg-card">
    <div className="flex items-center gap-3 border-b px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff7d6] text-[#9a6700] dark:bg-[rgba(255,214,10,.08)] dark:text-[#ffd60a]"><Icon className="h-4 w-4" /></span><div><h3 className="font-bold">{title}</h3><p className="mt-0.5 text-xs text-muted-foreground">Latest 8 records</p></div></div>
    {rows.length ? <div className="divide-y">{rows.map((row, index) => <div key={`${row.title}-${index}`} className="px-5 py-3.5 transition-colors hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{row.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-semibold capitalize text-muted-foreground">{row.status.replace('_', ' ')}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{row.detail}</p></div><p className="shrink-0 text-xs font-semibold tabular-nums">{row.value}</p></div></div>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center"><CircleCheck className="h-7 w-7 text-emerald-600" /><p className="mt-3 text-sm font-semibold">{empty}</p><p className="mt-1 text-xs text-muted-foreground">New activity will appear here automatically.</p></div>}
  </article>
}
