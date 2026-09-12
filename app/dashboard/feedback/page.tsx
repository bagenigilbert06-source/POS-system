import Link from 'next/link'
import { and, eq, inArray } from 'drizzle-orm'
import { BarChart3, Building2, MessageSquareText, ReceiptText, Star, UserRound } from 'lucide-react'
import { db } from '@/lib/db'
import { branch } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'
import { getFeedbackReport } from '@/lib/feedback/reporting'
import { formatCurrency, formatDateTime } from '@/lib/utils'

type SearchParams = Record<string, string | undefined>

const categoryStyles: Record<string, string> = {
  PROMOTER: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-800',
  PASSIVE: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-800',
  DETRACTOR: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-800',
}

function scoreToStars(score: number) {
  if (score >= 10) return 5
  if (score >= 8) return 4
  if (score >= 6) return 3
  if (score >= 3) return 2
  return 1
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Star }) {
  return <section className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[var(--dashboard-muted)]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.03em] tabular-nums text-[var(--dashboard-text)]">{value}</p></div><span className="grid size-9 place-items-center rounded-lg border border-[#ead48d] bg-[#fff8e8] text-[#9a6900] dark:border-[#80651d] dark:bg-[#30270f] dark:text-[#f5c542]"><Icon className="size-4" /></span></div>
    <p className="mt-2 text-[11px] text-[var(--dashboard-muted)]">{detail}</p>
  </section>
}

export default async function FeedbackDashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await requireDashboardPermission(PermissionEnum.REPORT_VIEW)
  const params = await searchParams
  const allowed = auth.role === RoleEnum.MANAGER || auth.role === RoleEnum.STORE_MANAGER ? auth.branchIds : undefined
  const branches = await db.select({ id: branch.id, name: branch.name }).from(branch).where(and(eq(branch.organizationId, auth.organizationId), allowed !== undefined ? inArray(branch.id, allowed) : undefined))
  const selected = params.branch && branches.some(item => item.id === params.branch) ? [params.branch] : undefined
  const parsedScore = params.score === undefined || params.score === '' ? undefined : Number(params.score)
  const report = await getFeedbackReport({ organizationId: auth.organizationId, branchIds: selected ?? allowed, category: params.category || undefined, score: Number.isFinite(parsedScore) ? parsedScore : undefined, tag: params.tag || undefined })
  const starRatings = report.rows.map(row => scoreToStars(row.score))
  const averageRating = starRatings.length ? (starRatings.reduce((sum, rating) => sum + rating, 0) / starRatings.length).toFixed(1) : '—'
  const positiveShare = report.responses ? Math.round(report.promoters / report.responses * 100) : 0
  const hasFilters = Boolean(params.branch || params.category || params.score || params.tag)

  return <main className="mx-auto max-w-[1320px] space-y-5 pb-10">
    <header className="flex flex-col justify-between gap-4 border-b border-[var(--dashboard-border)] pb-5 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a36f00] dark:text-[#f5c542]">Customer experience</p><h1 className="mt-1 text-2xl font-bold tracking-[-.03em] text-[var(--dashboard-text)]">Receipt feedback</h1><p className="mt-1 max-w-2xl text-sm text-[var(--dashboard-muted)]">See what customers shared after scanning the QR code on their receipt.</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--dashboard-text)]"><span className="size-2 rounded-full bg-emerald-500" />{report.responses} response{report.responses === 1 ? '' : 's'}</span>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Average rating" value={averageRating === '—' ? averageRating : `${averageRating} / 5`} detail="Average for the selected view" icon={Star} />
      <Metric label="NPS" value={report.nps > 0 ? `+${report.nps}` : report.nps} detail={`${positiveShare}% promoter share`} icon={BarChart3} />
      <Metric label="Promoters" value={report.promoters} detail="Customers most likely to recommend" icon={UserRound} />
      <Metric label="Needs attention" value={report.detractors} detail="Responses worth following up" icon={MessageSquareText} />
    </div>

    <form className="grid gap-3 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_.7fr_1fr_auto]">
      <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--dashboard-muted)]">Branch</span><select name="branch" defaultValue={params.branch ?? ''} className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none focus:border-[#d99a00] focus:ring-2 focus:ring-[#f4b41b]/20"><option value="">All branches</option>{branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--dashboard-muted)]">Sentiment</span><select name="category" defaultValue={params.category ?? ''} className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none focus:border-[#d99a00] focus:ring-2 focus:ring-[#f4b41b]/20"><option value="">All sentiment</option><option value="PROMOTER">Promoters</option><option value="PASSIVE">Passive</option><option value="DETRACTOR">Detractors</option></select></label>
      <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--dashboard-muted)]">NPS score</span><input name="score" type="number" min="0" max="10" defaultValue={params.score ?? ''} placeholder="0–10" className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none placeholder:text-[var(--dashboard-muted)] focus:border-[#d99a00] focus:ring-2 focus:ring-[#f4b41b]/20" /></label>
      <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--dashboard-muted)]">Tag</span><select name="tag" defaultValue={params.tag ?? ''} className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none focus:border-[#d99a00] focus:ring-2 focus:ring-[#f4b41b]/20"><option value="">All topics</option>{['Friendly service', 'Fast checkout', 'Product availability', 'Staff helpfulness', 'Store cleanliness', 'Pricing', 'Waiting time', 'Other'].map(tag => <option key={tag}>{tag}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="h-10 flex-1 rounded-lg bg-[#f4b41b] px-4 text-sm font-semibold text-[#171717] transition hover:bg-[#e2a713]">Apply</button>{hasFilters && <Link href="/dashboard/feedback" className="grid h-10 place-items-center rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-semibold text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)]">Clear</Link>}</div>
    </form>

    <section className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-center justify-between border-b border-[var(--dashboard-border)] px-5 py-4"><div><h2 className="font-semibold text-[var(--dashboard-text)]">Customer responses</h2><p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">Newest feedback appears first.</p></div><MessageSquareText className="size-5 text-[#b67d00]" /></div>
      {report.rows.length ? <div className="divide-y divide-[var(--dashboard-border)]">{report.rows.map(row => {
        const stars = scoreToStars(row.score)
        const customerLabel = row.customerName?.trim() || 'Walk-in customer'
        const contact = row.customerPhone || row.customerEmail
        const tags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : []
        return <article key={row.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-[var(--dashboard-surface-subtle)] lg:grid-cols-[190px_minmax(0,1fr)_250px]">
          <div><div className="flex gap-0.5" aria-label={`${stars} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < stars ? 'fill-[#f4b41b] text-[#f4b41b]' : 'text-[#d0d5dd]'}`} />)}</div><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ring-1 ring-inset ${categoryStyles[row.category] ?? categoryStyles.PASSIVE}`}>{row.category.charAt(0) + row.category.slice(1).toLowerCase()}</span><p className="mt-3 text-xs font-medium text-[var(--dashboard-text)]">{formatDateTime(row.submittedAt)}</p><p className="mt-0.5 text-[11px] text-[var(--dashboard-muted)]">Purchase {formatDateTime(row.saleCreatedAt)}</p></div>
          <div className="min-w-0"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fff8e8] text-[#9a6900] dark:bg-[#30270f] dark:text-[#f5c542]"><UserRound className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--dashboard-text)]">{customerLabel}</p><p className="truncate text-[11px] text-[var(--dashboard-muted)]">{contact || 'Anonymous receipt response'}</p></div></div><blockquote className="mt-3 text-sm leading-6 text-[var(--dashboard-text)]">{row.comment?.trim() ? `“${row.comment.trim()}”` : <span className="italic text-[var(--dashboard-muted)]">No written comment provided.</span>}</blockquote>{tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map(tag => <span key={tag} className="rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2.5 py-1 text-[10px] font-medium text-[var(--dashboard-muted)]">{tag}</span>)}</div>}</div>
          <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-3"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--dashboard-muted)]"><ReceiptText className="size-3.5" />Receipt</span><Link href={`/dashboard/sales/${row.saleId}`} className="font-mono text-xs font-semibold text-[#9a6900] hover:underline dark:text-[#f5c542]">{row.receiptNo}</Link></div><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-[var(--dashboard-muted)]">Total</dt><dd className="font-semibold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(Number(row.saleTotal))}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--dashboard-muted)]">Payment</dt><dd className="capitalize text-[var(--dashboard-text)]">{row.paymentMethod.replaceAll('_', ' ')}</dd></div><div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-[var(--dashboard-muted)]"><Building2 className="size-3" />Branch</dt><dd className="truncate text-right text-[var(--dashboard-text)]">{row.branchName}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--dashboard-muted)]">Cashier</dt><dd className="truncate text-right text-[var(--dashboard-text)]">{row.cashierName || '—'}</dd></div></dl></div>
        </article>
      })}</div> : <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><MessageSquareText className="size-5" /></span><h3 className="mt-4 font-semibold text-[var(--dashboard-text)]">No feedback found</h3><p className="mt-1 text-sm text-[var(--dashboard-muted)]">New receipt QR responses will appear here.</p>{hasFilters && <Link href="/dashboard/feedback" className="mt-4 inline-flex rounded-lg border border-[var(--dashboard-border)] px-3 py-2 text-xs font-semibold text-[var(--dashboard-text)]">Clear filters</Link>}</div></div>}
    </section>
  </main>
}
