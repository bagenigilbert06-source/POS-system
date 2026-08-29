import Link from 'next/link'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { AlertTriangle, Box, CheckCircle2, CircleDot, Clock3, Settings2 } from 'lucide-react'
import { db } from '@/lib/db'
import { branch, etimsConfiguration } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { getEtimsDashboard } from '@/app/actions/etims'
import { EtimsConfigurationPanel } from '@/components/etims/etims-configuration-panel'
import { EtimsBranchSelector } from '@/components/etims/etims-branch-selector'
import { EtimsCreditRetryButton, EtimsRetryButton } from '@/components/etims/etims-retry-button'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterFields, FilterPanel } from '@/components/ui/filter-panel'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getEtimsProviderCapabilities } from '@/lib/etims/provider-factory'

export const metadata = { title: 'eTIMS | Pesaby' }
export const dynamic = 'force-dynamic'

const tabs = [['overview', 'Overview'], ['invoices', 'Fiscal invoices'], ['exceptions', 'Exceptions'], ['credits', 'Credit notes'], ['settings', 'Settings']] as const
type Dashboard = Awaited<ReturnType<typeof getEtimsDashboard>>
type Configuration = { connectionStatus: string; environment: string; integrationMethod: string; businessKraPin: string | null; externalBranchId: string | null; deviceId: string | null; lastConnectionSuccessAt: Date | null; lastConnectionTestAt: Date | null }
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value }

export default async function EtimsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireDashboardPermission(PermissionEnum.ETIMS_VIEW)
  const params = await searchParams
  const tab = one(params.tab) ?? 'overview'
  const selectedBranchId = one(params.branch)
  const branchScope = auth.isOrganizationWide ? undefined : inArray(branch.id, auth.branchIds.length ? auth.branchIds : [''])
  const branches = await db.select({ id: branch.id, name: branch.name, code: branch.code }).from(branch)
    .where(and(eq(branch.organizationId, auth.organizationId), branchScope)).orderBy(asc(branch.name))
  const branchId = selectedBranchId && branches.some((item) => item.id === selectedBranchId) ? selectedBranchId : branches[0]?.id
  const configurations = await db.select({ branchId: etimsConfiguration.branchId, environment: etimsConfiguration.environment,
    integrationMethod: etimsConfiguration.integrationMethod, businessKraPin: etimsConfiguration.businessKraPin,
    externalBranchId: etimsConfiguration.externalBranchId, vatRegistered: etimsConfiguration.vatRegistered,
    providerName: etimsConfiguration.providerName, deviceId: etimsConfiguration.deviceId,
    connectionStatus: etimsConfiguration.connectionStatus, lastConnectionTestAt: etimsConfiguration.lastConnectionTestAt,
    lastConnectionSuccessAt: etimsConfiguration.lastConnectionSuccessAt }).from(etimsConfiguration)
    .where(and(eq(etimsConfiguration.organizationId, auth.organizationId), branchId ? eq(etimsConfiguration.branchId, branchId) : undefined))
  const config = configurations[0]
  const dashboard = await getEtimsDashboard({ branchId, status: one(params.status), receipt: one(params.receipt),
    customer: one(params.customer), from: one(params.from), to: one(params.to), page: Number(one(params.page) ?? 1), exceptionsOnly: tab === 'exceptions' })
  const canRetry = auth.permissions.includes(PermissionEnum.ETIMS_RETRY)
  const canConfigure = auth.permissions.includes(PermissionEnum.ETIMS_CONFIGURE)
  const safeConfigs = configurations.map((item) => ({ ...item, environment: item.environment === 'production' ? 'production' as const : 'sandbox' as const,
    integrationMethod: item.integrationMethod === 'VSCU' ? 'VSCU' as const : 'OSCU' as const, businessKraPin: item.businessKraPin ?? '', externalBranchId: item.externalBranchId ?? '', deviceId: item.deviceId ?? '' }))

  return <div className="mx-auto max-w-[1480px] space-y-4 pb-8 text-sm">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">eTIMS</h1><p className="mt-0.5 text-xs text-muted-foreground">Electronic fiscal invoicing and KRA transmission</p></div>
      <EtimsBranchSelector branches={branches} value={branchId}/>
    </header>
    <nav className="flex gap-2 overflow-x-auto border-b" aria-label="eTIMS sections">
      {tabs.map(([id, label]) => <Link key={id} href={`?tab=${id}${branchId ? `&branch=${branchId}` : ''}`} className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-semibold ${tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</Link>)}
    </nav>

    {tab === 'overview' && !config && <UnconfiguredOverview branchId={branchId} canConfigure={canConfigure} readiness={dashboard.readiness}/>}
    {tab === 'overview' && config && <ConfiguredOverview dashboard={dashboard} config={config} branchName={branches.find((item) => item.id === branchId)?.name} branchId={branchId} canConfigure={canConfigure}/>}
    {(tab === 'invoices' || tab === 'exceptions') && <><Filters branchId={branchId} params={params} tab={tab}/><InvoiceTable rows={dashboard.rows} canRetry={canRetry} empty={tab === 'exceptions' ? 'Everything looks good. There are no operational fiscal exceptions.' : 'No fiscal invoices yet. Fiscal invoices will appear after completed sales are submitted.'}/><Pagination page={dashboard.pagination.page} pages={dashboard.pagination.pages} tab={tab} branchId={branchId}/></>}
    {tab === 'credits' && <CreditTable rows={dashboard.creditRows} canRetry={canRetry}/>}
    {tab === 'settings' && (canConfigure ? <EtimsConfigurationPanel branches={branches} configurations={safeConfigs} selectedBranchId={branchId} capabilities={getEtimsProviderCapabilities({ providerName: config?.providerName ?? 'mock' })}/> : <section className="app-panel p-6 text-xs text-muted-foreground">You do not have permission to change branch fiscal settings.</section>)}
  </div>
}

function UnconfiguredOverview({ branchId, canConfigure, readiness }: { branchId?: string; canConfigure: boolean; readiness: Dashboard['readiness'] }) {
  const missing = Math.max(0, readiness.total - readiness.ready)
  return <div className="space-y-4">
    <section className="app-panel flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/[0.06] p-5">
      <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500"/><div><h2 className="text-base font-semibold">eTIMS is not configured for this branch</h2><p className="mt-1 text-xs text-muted-foreground">Connect this branch before fiscal invoices can be transmitted.</p></div></div>
      {canConfigure && <Link href={`?tab=settings&branch=${branchId ?? ''}`} className="rounded-md bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">Set up eTIMS</Link>}
    </section>
    <div><h2 className="text-sm font-semibold">Before you go live</h2><div className="mt-2 grid gap-3 md:grid-cols-2">
      <section className="app-panel p-4"><p className="text-sm font-semibold">Fiscal connection</p><dl className="mt-3 flex items-center justify-between text-xs"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold text-amber-600">Not configured</dd></dl>{canConfigure && <Link href={`?tab=settings&branch=${branchId ?? ''}`} className="mt-4 inline-flex text-xs font-semibold text-primary">Set up connection →</Link>}</section>
      <ProductReadiness readiness={readiness} compact/>
    </div></div>
    {missing > 0 && <p className="text-xs text-muted-foreground">Complete the connection and fiscal product mapping before processing live fiscal invoices.</p>}
  </div>
}

function ConfiguredOverview({ dashboard, config, branchName, branchId, canConfigure }: { dashboard: Dashboard; config: Configuration; branchName?: string; branchId?: string; canConfigure: boolean }) {
  return <div className="space-y-4">
    <Connection config={config} branchName={branchName} canConfigure={canConfigure} branchId={branchId}/>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Metric label="Fiscal invoices today" value={dashboard.summary.submittedToday}/><Metric label="Accepted" value={dashboard.summary.accepted} tone="success"/><Metric label="Pending" value={Number(dashboard.summary.pending) + Number(dashboard.summary.retrying)} tone="warning"/><Metric label="Failed" value={dashboard.summary.failed} tone="error"/><Metric label="Credit notes" value={dashboard.summary.creditNotes}/></div>
    <div className="grid gap-3 md:grid-cols-2"><Money label="Accepted sales value" value={Number(dashboard.summary.acceptedValue)}/><Money label="Accepted tax" value={Number(dashboard.summary.acceptedTax)}/></div>
    <div className="grid gap-3 lg:grid-cols-2"><FiscalConnectionCard config={config} branchName={branchName} branchId={branchId}/><ProductReadiness readiness={dashboard.readiness}/></div>
    <Attention summary={dashboard.summary} readiness={dashboard.readiness} branchId={branchId}/>
    <RecentInvoices rows={dashboard.rows.slice(0, 5)} branchId={branchId}/>
  </div>
}

function Connection({ config, branchName, canConfigure, branchId }: { config: Configuration; branchName?: string; canConfigure: boolean; branchId?: string }) {
  const connected = config.connectionStatus === 'CONNECTED'; const sandbox = config.connectionStatus === 'SANDBOX'; const failed = config.connectionStatus === 'ERROR'
  const label = connected ? 'Connected to KRA' : sandbox ? 'Test connection verified' : failed ? 'Connection needs attention' : 'Connection verification pending'
  return <section className={`app-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${connected ? 'bg-emerald-500/[0.04]' : failed ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
    <div className="flex gap-2.5">{connected ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> : sandbox ? <Clock3 className="h-4 w-4 text-amber-600"/> : <CircleDot className={`h-4 w-4 ${failed ? 'text-red-600' : 'text-amber-600'}`}/>}<div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{config.environment === 'production' ? 'Production' : 'Test environment'} · {config.integrationMethod} · {branchName}</p>{config.lastConnectionSuccessAt && <p className="mt-0.5 text-[11px] text-muted-foreground">Last successful verification {formatDateTime(config.lastConnectionSuccessAt)}</p>}</div></div>
    {canConfigure && <Link href={`?tab=settings&branch=${branchId ?? ''}`} className="rounded-md border px-3 py-1.5 text-xs font-semibold">Manage connection</Link>}
  </section>
}

function FiscalConnectionCard({ config, branchName, branchId }: { config: Configuration; branchName?: string; branchId?: string }) {
  const connected = ['CONNECTED', 'SANDBOX'].includes(config.connectionStatus)
  return <section className="app-panel p-4"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Fiscal connection</h2><p className={`mt-1 text-xs font-semibold ${connected ? 'text-emerald-600' : config.connectionStatus === 'ERROR' ? 'text-red-600' : 'text-amber-600'}`}>● {config.connectionStatus.replaceAll('_', ' ')}</p></div><Settings2 className="h-4 w-4 text-muted-foreground"/></div>
    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs"><div><dt className="text-muted-foreground">Environment</dt><dd className="mt-0.5 font-medium">{config.environment === 'production' ? 'Production' : 'Test'} · {config.integrationMethod}</dd></div><div><dt className="text-muted-foreground">KRA PIN</dt><dd className="mt-0.5 font-medium">{config.businessKraPin ?? '—'}</dd></div><div><dt className="text-muted-foreground">Branch</dt><dd className="mt-0.5 font-medium">{config.externalBranchId ?? '—'} · {branchName}</dd></div><div><dt className="text-muted-foreground">Device identifier</dt><dd className="mt-0.5 truncate font-medium">{config.deviceId ?? '—'}</dd></div></dl>
    <Link href={`?tab=settings&branch=${branchId ?? ''}`} className="mt-4 inline-flex text-xs font-semibold text-primary">Manage connection →</Link>
  </section>
}

function ProductReadiness({ readiness, compact = false }: { readiness: Dashboard['readiness']; compact?: boolean }) {
  const missing = Math.max(0, readiness.total - readiness.ready)
  return <section className={`app-panel ${compact ? 'p-4' : 'p-4'}`}><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Product readiness</h2><p className="mt-2 text-xl font-bold tabular-nums">{readiness.ready} of {readiness.total} ready</p><p className={`mt-1 text-xs ${missing ? 'text-amber-600' : 'text-muted-foreground'}`}>{missing ? `${missing} products require fiscal configuration` : 'All active products are fiscally ready'}</p></div><Box className="h-4 w-4 text-muted-foreground"/></div><Link href="/dashboard/products?fiscal=attention" className="mt-4 inline-flex text-xs font-semibold text-primary">Review products →</Link></section>
}

function Attention({ summary, readiness, branchId }: { summary: Dashboard['summary']; readiness: Dashboard['readiness']; branchId?: string }) {
  const failed = Number(summary.failed); const retrying = Number(summary.retrying); const missing = Math.max(0, readiness.total - readiness.ready); const total = failed + retrying + missing
  return <section className="app-panel p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold">Needs attention</h2>{total === 0 ? <><p className="mt-2 text-sm font-medium text-emerald-600">Everything looks good</p><p className="mt-0.5 text-xs text-muted-foreground">No eTIMS issues require attention.</p></> : <div className="mt-2 space-y-1 text-xs">{failed > 0 && <p><span className="font-semibold text-red-600">{failed} failed fiscal {failed === 1 ? 'invoice' : 'invoices'}</span> · <Link href={`?tab=exceptions&branch=${branchId ?? ''}`} className="font-semibold text-primary">View exceptions →</Link></p>}{retrying > 0 && <p><span className="font-semibold text-amber-600">{retrying} pending retry</span> · <Link href={`?tab=exceptions&branch=${branchId ?? ''}`} className="font-semibold text-primary">Review →</Link></p>}{missing > 0 && <p><span className="font-semibold text-amber-600">{missing} products need fiscal configuration</span> · <Link href="/dashboard/products?fiscal=attention" className="font-semibold text-primary">Review products →</Link></p>}</div>}</div>{total > 0 && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">{total} items</span>}</div></section>
}

function RecentInvoices({ rows, branchId }: { rows: Dashboard['rows']; branchId?: string }) {
  return <section className="app-panel overflow-hidden"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-base font-semibold">Recent fiscal invoices</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Latest fiscal activity for this branch.</p></div>{rows.length > 0 && <Link href={`?tab=invoices&branch=${branchId ?? ''}`} className="text-xs font-semibold text-primary">View all fiscal invoices →</Link>}</div>
    {!rows.length ? <EmptyState className="py-7" title="No fiscal invoices yet" description="Fiscal invoices will appear here after completed sales are successfully processed."/> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b bg-muted/20 text-muted-foreground"><tr>{['Receipt', 'Customer', 'Amount', 'Status', 'Fiscal reference', 'Time'].map((item) => <th key={item} className="px-4 py-2.5 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="px-4 py-2.5 font-semibold"><Link href={`/dashboard/sales/${row.saleId}`}>{row.receiptNo}</Link></td><td className="px-4 py-2.5">{row.customerName ?? 'Walk-in'}</td><td className="px-4 py-2.5 font-semibold tabular-nums">{formatCurrency(row.amount)}</td><td className="px-4 py-2.5"><Status value={row.status}/></td><td className="px-4 py-2.5 font-mono text-[10px]">{row.reference ?? '—'}</td><td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(row.createdAt)}</td></tr>)}</tbody></table></div>}
  </section>
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: string }) { return <div className="app-panel px-4 py-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-1.5 text-xl font-bold tabular-nums ${tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'error' ? 'text-red-600' : ''}`}>{Number(value)}</p></div> }
function Money({ label, value }: { label: string; value: number }) { return <div className="app-panel px-4 py-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1.5 text-lg font-bold tabular-nums">{formatCurrency(value)}</p></div> }
function Status({ value }: { value: string }) { const cls = value === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-700' : value === 'FAILED' ? 'bg-red-500/10 text-red-700' : value === 'CREDITED' ? 'bg-muted text-muted-foreground' : 'bg-amber-500/10 text-amber-700'; return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${cls}`}>{value.replaceAll('_', ' ')}</span> }

function InvoiceTable({ rows, canRetry, empty }: { rows: Dashboard['rows']; canRetry: boolean; empty: string }) {
  return <section className="app-panel overflow-hidden"><div className="border-b px-4 py-3"><h2 className="text-base font-semibold">Fiscal invoices</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b bg-muted/30"><tr>{['Receipt', 'Date / customer', 'Amount', 'Tax', 'Fiscal status', 'Fiscal/CU invoice', 'Attempts', 'Last submission', 'Actions'].map((item) => <th key={item} className="px-4 py-2.5 font-semibold">{item}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="px-4 py-2.5 font-semibold">{row.receiptNo}</td><td className="px-4 py-2.5">{formatDateTime(row.createdAt)}<span className="mt-0.5 block text-muted-foreground">{row.customerName ?? 'Walk-in'}</span></td><td className="px-4 py-2.5 font-semibold">{formatCurrency(row.amount)}</td><td className="px-4 py-2.5">{formatCurrency(row.tax)}</td><td className="px-4 py-2.5"><Status value={row.status}/></td><td className="px-4 py-2.5 font-mono text-[10px]">{row.reference ?? '—'}</td><td className="px-4 py-2.5 text-center">{row.attempts}</td><td className="px-4 py-2.5">{row.lastSubmissionAt ? formatDateTime(row.lastSubmissionAt) : '—'}</td><td className="px-4 py-2.5"><div className="flex gap-2"><Link href={`/dashboard/sales/${row.saleId}`} className="rounded-md border px-2.5 py-1.5 font-semibold">View</Link>{canRetry && ['FAILED', 'RETRYING', 'PENDING'].includes(row.status) && <EtimsRetryButton id={row.id}/>}</div></td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-5 py-10 text-center text-xs text-muted-foreground">{empty}</td></tr>}</tbody></table></div></section>
}

function Filters({ branchId, params, tab }: { branchId?: string; params: Record<string, string | string[] | undefined>; tab: string }) { return <FilterPanel><form><FilterFields><input type="hidden" name="tab" value={tab}/><input type="hidden" name="branch" value={branchId}/>{[['status', 'Status'], ['receipt', 'Receipt number'], ['customer', 'Customer'], ['from', 'From'], ['to', 'To']].map(([name, label]) => <label key={name} className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}{name === 'status' ? <select name={name} defaultValue={one(params[name]) ?? 'all'} className="h-10 rounded-md border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"><option value="all">All statuses</option>{['PENDING', 'SUBMITTING', 'ACCEPTED', 'RETRYING', 'FAILED', 'CREDITED'].map((status) => <option key={status}>{status}</option>)}</select> : <input name={name} type={name === 'from' || name === 'to' ? 'date' : 'text'} defaultValue={one(params[name]) ?? ''} className="h-10 rounded-md border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"/>}</label>)}<button className="h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground">Apply filters</button></FilterFields></form></FilterPanel> }
function Pagination({ page, pages, tab, branchId }: { page: number; pages: number; tab: string; branchId?: string }) { if (pages <= 1) return null; return <div className="flex justify-end gap-2"><Link aria-disabled={page <= 1} href={`?tab=${tab}&branch=${branchId ?? ''}&page=${Math.max(1, page - 1)}`} className="rounded-md border px-3 py-1.5 text-xs">Previous</Link><span className="px-2 py-1.5 text-xs text-muted-foreground">Page {page} of {pages}</span><Link aria-disabled={page >= pages} href={`?tab=${tab}&branch=${branchId ?? ''}&page=${Math.min(pages, page + 1)}`} className="rounded-md border px-3 py-1.5 text-xs">Next</Link></div> }
function CreditTable({ rows, canRetry }: { rows: Dashboard['creditRows']; canRetry: boolean }) { return <section className="app-panel overflow-hidden"><div className="border-b px-4 py-3"><h2 className="text-base font-semibold">Credit notes</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Fiscal corrections linked to completed returns.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b bg-muted/30"><tr>{['Credit note', 'Original receipt', 'Amount', 'Status', 'Date', 'Actions'].map((item) => <th key={item} className="px-4 py-2.5">{item}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="px-4 py-2.5 font-mono">{row.reference ?? row.returnNo}</td><td className="px-4 py-2.5">{row.receiptNo}</td><td className="px-4 py-2.5">{formatCurrency(row.amount)}</td><td className="px-4 py-2.5"><Status value={row.status}/></td><td className="px-4 py-2.5">{row.lastAttemptAt ? formatDateTime(row.lastAttemptAt) : '—'}</td><td className="px-4 py-2.5"><div className="flex gap-2"><Link href={`/dashboard/sales/${row.saleId}`} className="rounded border px-2.5 py-1.5">View</Link>{canRetry && ['FAILED', 'RETRYING', 'PENDING'].includes(row.status) && <EtimsCreditRetryButton id={row.id}/>}</div></td></tr>)}{!rows.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No fiscal credit notes yet.</td></tr>}</tbody></table></div></section> }
