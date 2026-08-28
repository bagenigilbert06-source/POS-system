import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CircleCheck,
  Clock3,
  CreditCard,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { getOperationsData } from '@/app/actions/operations';
import {
  OperationalActivity,
  type OperationalActivityItem,
} from '@/components/operations/operational-activity';
import { OperationsControl } from '@/components/operations/operations-control';
import { ShiftHistory } from '@/components/operations/shift-history';
import {
  getAuthorizationContext,
  getDefaultWorkspaceRoute,
} from '@/lib/auth/authorization';
import { RoleEnum } from '@/lib/types/permissions';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatNumber } from '@/lib/utils/format';
import { resolveReportPeriod } from '@/lib/reports/report-rules';

type Params = Record<string, string | string[] | undefined>;
const first = (params: Params | undefined, key: string) => {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
};
const dateKey = (value: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const authorization = await getAuthorizationContext();
  if (
    ![
      RoleEnum.OWNER,
      RoleEnum.ADMIN,
      RoleEnum.MANAGER,
      RoleEnum.SUPERVISOR,
    ].includes(authorization.role)
  )
    redirect(getDefaultWorkspaceRoute(authorization));
  const { organization, config } = await requireWorkspaceModule('pos');
  const isLiquorStore = config.businessCategory === 'liquor_shop';
  const timeZone = organization.timezone || 'Africa/Nairobi';
  const params = await searchParams;
  const preset = first(params, 'period') || 'today';
  const today = dateKey(new Date(), timeZone);
  const period = resolveReportPeriod(
    preset,
    first(params, 'from'),
    first(params, 'to'),
    today
  );
  const location = first(params, 'location') || '';
  const register = first(params, 'register') || '';
  const cashier = first(params, 'cashier') || '';
  const status = first(params, 'status') || '';
  const query = (first(params, 'q') || '').trim().toLowerCase();
  const data = await getOperationsData(timeZone);
  const currency = organization.currency || 'KES';
  const tolerance = data.cashVarianceTolerance;
  const inPeriod = (value: Date) => {
    const key = dateKey(value, timeZone);
    return key >= period.from && key <= period.to;
  };
  const matchesShift = (
    shift: (typeof data.shiftHistory)[number],
    includePeriod = true
  ) =>
    (!includePeriod || inPeriod(shift.openedAt)) &&
    (!location || shift.branchId === location) &&
    (!register || shift.terminalId === register) &&
    (!cashier || shift.openedBy === cashier) &&
    (!status ||
      (status === 'needs_review'
        ? shift.status === 'closed' &&
          Math.abs(Number(shift.variance || 0)) > tolerance
        : shift.status === status)) &&
    (!query ||
      `${shift.sessionNo} ${shift.id} ${shift.cashierName} ${shift.terminalName} ${shift.locationName}`
        .toLowerCase()
        .includes(query));
  const filteredShifts = data.shiftHistory.filter((shift) =>
    matchesShift(shift)
  );
  const activeShifts = data.shiftHistory.filter(
    (shift) =>
      ['open', 'closing'].includes(shift.status) && matchesShift(shift, false)
  );
  const varianceReviews = data.shiftHistory.filter(
    (shift) =>
      shift.status === 'closed' &&
      inPeriod(shift.closedAt || shift.openedAt) &&
      Math.abs(Number(shift.variance || 0)) > tolerance &&
      (!location || shift.branchId === location)
  );
  const reconciling = data.shiftHistory.filter(
    (shift) =>
      shift.status === 'closing' && (!location || shift.branchId === location)
  );
  const filteredLosses = data.losses.filter(
    (item) =>
      inPeriod(item.createdAt) &&
      (!location || item.branchId === location) &&
      (!query ||
        `${item.lossNo} ${item.productName} ${item.reason} ${item.type}`
          .toLowerCase()
          .includes(query))
  );
  const filteredReturns = data.returns.filter(
    (item) =>
      inPeriod(item.createdAt) &&
      (!location || item.branchId === location) &&
      (!query ||
        `${item.returnNo} ${item.receiptNo} ${item.reason}`
          .toLowerCase()
          .includes(query))
  );
  const pendingPayments = data.pendingPayments.filter(
    (item) => !location || item.branchId === location
  );
  const needsReviewCount =
    varianceReviews.length +
    reconciling.length +
    pendingPayments.length +
    filteredLosses.length;
  const openCount = activeShifts.filter(
    (item) => item.status === 'open'
  ).length;
  const varianceTotal = filteredShifts
    .filter((item) => item.closedAt && inPeriod(item.closedAt))
    .reduce((sum, item) => sum + Number(item.variance || 0), 0);
  const lossTotal = filteredLosses.reduce(
    (sum, item) => sum + Number(item.totalCost),
    0
  );
  const locationNames = new Map(
    data.locations.map((item) => [item.id, item.name])
  );
  const actorName = (id: string) => data.actorNames[id] || id.slice(0, 8);

  const activity: OperationalActivityItem[] = [
    ...filteredShifts.map((item) => ({
      id: item.id,
      category: 'shifts' as const,
      title: `${item.status === 'closed' ? 'Shift closed' : item.status === 'closing' ? 'Reconciliation started' : 'Shift opened'} · ${item.sessionNo}`,
      detail: `${item.terminalName} · ${item.locationName}`,
      actor: item.cashierName,
      time: formatDateTime(item.closedAt || item.openedAt),
      timestamp: (item.closedAt || item.openedAt).getTime(),
      value:
        item.variance == null
          ? undefined
          : formatCurrency(Number(item.variance), currency),
      status: item.status,
    })),
    ...data.recentCashMovements
      .filter(
        (item) =>
          inPeriod(item.createdAt) &&
          (!location || item.branchId === location) &&
          (!query ||
            `${item.type} ${item.reason} ${actorName(item.userId)}`
              .toLowerCase()
              .includes(query))
      )
      .map((item) => ({
        id: item.id,
        category: 'cash' as const,
        title: item.type.replaceAll('_', ' '),
        detail: `${item.reason} · ${locationNames.get(item.branchId || '') || 'Unknown location'}`,
        actor: actorName(item.userId),
        time: formatDateTime(item.createdAt),
        timestamp: item.createdAt.getTime(),
        value: formatCurrency(Number(item.amount), currency),
        status: 'recorded',
      })),
    ...filteredReturns.map((item) => ({
      id: item.id,
      category: 'refunds' as const,
      title: `Refund ${item.returnNo}`,
      detail: `${item.receiptNo} · ${item.reason}`,
      actor: actorName(item.userId),
      time: formatDateTime(item.createdAt),
      timestamp: item.createdAt.getTime(),
      value: formatCurrency(Number(item.amount), currency),
      status: item.status,
    })),
    ...filteredLosses.map((item) => ({
      id: item.id,
      category: 'inventory' as const,
      title: `${item.productName} stock loss`,
      detail: `${item.quantity} units · ${item.reason}`,
      actor: actorName(item.userId),
      time: formatDateTime(item.createdAt),
      timestamp: item.createdAt.getTime(),
      value: formatCurrency(Number(item.totalCost), currency),
      status: item.type,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 80);

  const metrics = [
    {
      label: 'Open shifts',
      value: formatNumber(openCount),
      detail: `${reconciling.length} currently reconciling`,
      icon: Banknote,
      tone: openCount ? 'positive' : 'neutral',
      href: '#active-shifts',
    },
    {
      label: 'Needs review',
      value: formatNumber(needsReviewCount),
      detail: needsReviewCount
        ? 'Operational exceptions in scope'
        : 'No exceptions in scope',
      icon: AlertTriangle,
      tone: needsReviewCount ? 'warning' : 'positive',
      href: '#needs-attention',
    },
    {
      label: 'Cash variance',
      value: formatCurrency(varianceTotal, currency),
      detail: `${varianceReviews.length} above policy tolerance`,
      icon: CreditCard,
      tone: varianceReviews.length ? 'warning' : 'positive',
      href: '#shift-history-title',
    },
    {
      label: 'Stock loss',
      value: formatCurrency(lossTotal, currency),
      detail: `${formatNumber(filteredLosses.reduce((sum, item) => sum + item.quantity, 0))} units recorded`,
      icon: Boxes,
      tone: filteredLosses.length ? 'warning' : 'neutral',
      href: '#operational-activity',
    },
  ] as const;

  return (
    <div className="dashboard-overview mx-auto w-full max-w-[1480px] space-y-4 pb-8">
      <header className="dashboard-welcome flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="dashboard-live-status">
              <i /> Live operations
            </span>
            <span className="dashboard-updated">
              Updated{' '}
              {new Date().toLocaleTimeString('en-KE', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone,
              })}
            </span>
          </div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#9a6700] dark:text-[#ffd60a]">
            Manager control center · {organization.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Operations
          </h1>
          <p className="mt-2 text-sm">
            Monitor active shifts, reconcile exceptions, and manage audited
            operational actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/pos"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ffd60a] px-5 text-sm font-semibold text-[#0b0b0d]"
          >
            <ShoppingBag className="h-4 w-4" />
            Point of sale
          </Link>
          <Link
            href="/dashboard/sales"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-5 text-sm font-semibold"
          >
            <ReceiptText className="h-4 w-4" />
            Sales
          </Link>
        </div>
      </header>

      <OperationsFilters
        params={{
          preset,
          from: period.from,
          to: period.to,
          location,
          register,
          cashier,
          status,
          query: first(params, 'q') || '',
        }}
        locations={data.locations}
        terminals={data.terminals}
        cashiers={[
          ...new Map(
            data.shiftHistory.map((item) => [item.openedBy, item.cashierName])
          ).entries(),
        ].map(([id, name]) => ({ id, name }))}
        today={today}
      />
      <section
        aria-label="Operations overview"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <NeedsAttention
        variance={varianceReviews}
        reconciling={reconciling}
        payments={pendingPayments}
        losses={filteredLosses}
        currency={currency}
      />
      {isLiquorStore && (
        <LiquorComplianceSummary
          verified={data.complianceToday.verified}
          needsReview={data.complianceToday.unverified}
        />
      )}
      <ActiveShifts shifts={activeShifts} currency={currency} />
      <OperationsControl
        products={data.products}
        sales={data.sales}
        locations={data.locations}
        currency={currency}
      />
      <div id="shift-history" className="scroll-mt-24">
        <ShiftHistory shifts={filteredShifts} currency={currency} />
      </div>
      <OperationalActivity items={activity} />
    </div>
  );
}

function LiquorComplianceSummary({
  verified,
  needsReview,
}: {
  verified: number;
  needsReview: number;
}) {
  const total = verified + needsReview;
  const rate = total ? (verified / total) * 100 : null;
  const clear = total > 0 && needsReview === 0;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="compliance-title">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${needsReview ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 id="compliance-title" className="text-base font-bold">Age-verification checks</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Today&apos;s completed liquor-sale checks.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/20 text-center sm:min-w-[360px]">
          <ComplianceMetric label="Verified" value={rate == null ? '—' : `${rate.toFixed(0)}%`} />
          <ComplianceMetric label="Checks" value={formatNumber(total)} />
          <ComplianceMetric label="To review" value={formatNumber(needsReview)} warning={needsReview > 0} />
        </div>
      </div>
      <div className={`flex items-center gap-2 border-t px-5 py-3 text-xs font-semibold ${clear ? 'text-emerald-700 dark:text-emerald-300' : needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
        {clear ? <CircleCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {clear ? 'All age-verification checks are complete.' : needsReview ? `${formatNumber(needsReview)} completed sale${needsReview === 1 ? '' : 's'} need review.` : 'No eligible liquor sales have been completed today.'}
      </div>
    </section>
  );
}

function ComplianceMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <p className={`text-base font-bold tabular-nums ${warning ? 'text-amber-700 dark:text-amber-300' : ''}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function OperationsFilters({
  params,
  locations,
  terminals,
  cashiers,
  today,
}: {
  params: {
    preset: string;
    from: string;
    to: string;
    location: string;
    register: string;
    cashier: string;
    status: string;
    query: string;
  };
  locations: { id: string; name: string }[];
  terminals: { id: string; name: string }[];
  cashiers: { id: string; name: string }[];
  today: string;
}) {
  return (
    <form method="get" className="app-panel flex flex-wrap items-end gap-2 p-3">
      <Filter label="Period">
        <select name="period" defaultValue={params.preset} className="control">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom</option>
        </select>
      </Filter>
      <Filter label="From">
        <input
          name="from"
          type="date"
          max={today}
          defaultValue={params.from}
          className="control"
        />
      </Filter>
      <Filter label="To">
        <input
          name="to"
          type="date"
          max={today}
          defaultValue={params.to}
          className="control"
        />
      </Filter>
      <Filter label="Location">
        <select
          name="location"
          defaultValue={params.location}
          className="control"
        >
          <option value="">All locations</option>
          {locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Filter>
      <Filter label="Register">
        <select
          name="register"
          defaultValue={params.register}
          className="control"
        >
          <option value="">All registers</option>
          {terminals.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Filter>
      <Filter label="Cashier">
        <select
          name="cashier"
          defaultValue={params.cashier}
          className="control"
        >
          <option value="">All cashiers</option>
          {cashiers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Filter>
      <Filter label="Status">
        <select name="status" defaultValue={params.status} className="control">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closing">Reconciling</option>
          <option value="closed">Closed</option>
          <option value="needs_review">Needs review</option>
        </select>
      </Filter>
      <label className="relative min-w-48 flex-1">
        <span className="sr-only">Search</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={params.query}
          placeholder="Shift, cashier, register…"
          className="control w-full pl-9"
        />
      </label>
      <button className="h-9 rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-xs font-bold text-[var(--dashboard-accent-cta-ink)]">
        Apply
      </button>
    </form>
  );
}
function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NeedsAttention({
  variance,
  reconciling,
  payments,
  losses,
  currency,
}: {
  variance: Array<{
    id: string;
    sessionNo: string;
    variance: string | null;
    cashierName: string;
  }>;
  reconciling: Array<{ id: string; sessionNo: string; cashierName: string }>;
  payments: Array<{
    id: string;
    amount: string;
    phone: string;
    status: string;
  }>;
  losses: Array<{
    id: string;
    productName: string;
    quantity: number;
    totalCost: string;
    type: string;
  }>;
  currency: string;
}) {
  const rows = [
    ...variance.map((item) => ({
      key: `v-${item.id}`,
      icon: Banknote,
      title: `Cash variance · ${item.sessionNo}`,
      detail: `${item.cashierName} · ${formatCurrency(Number(item.variance), currency)}`,
      tone: 'warning',
    })),
    ...reconciling.map((item) => ({
      key: `r-${item.id}`,
      icon: Clock3,
      title: `Reconciliation in progress · ${item.sessionNo}`,
      detail: item.cashierName,
      tone: 'warning',
    })),
    ...payments.map((item) => ({
      key: `p-${item.id}`,
      icon: CreditCard,
      title: 'M-Pesa payment needs completion',
      detail: `${item.phone} · ${formatCurrency(Number(item.amount), currency)} · ${item.status.replaceAll('_', ' ')}`,
      tone: 'danger',
    })),
    ...losses.slice(0, 5).map((item) => ({
      key: `l-${item.id}`,
      icon: Boxes,
      title: `Stock loss · ${item.productName}`,
      detail: `${item.quantity} units · ${formatCurrency(Number(item.totalCost), currency)} · ${item.type.replaceAll('_', ' ')}`,
      tone: 'warning',
    })),
  ];
  return (
    <section
      id="needs-attention"
      className="scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-bold">Needs attention</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Exceptions that need a manager to investigate or complete in the
          source workflow.
        </p>
      </div>
      {rows.length ? (
        <div className="divide-y">
          {rows.map(({ key, icon: Icon, title, detail, tone }) => (
            <div key={key} className="flex items-center gap-3 px-5 py-3.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-red-50 text-red-700 dark:bg-red-950/30' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30'}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {detail}
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-5">
          <CircleCheck className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">No operational exceptions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nothing in the selected scope currently exceeds policy or blocks
              reconciliation.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ActiveShifts({
  shifts,
  currency,
}: {
  shifts: Array<{
    id: string;
    sessionNo: string;
    status: string;
    cashierName: string;
    terminalName: string;
    locationName: string;
    openedAt: Date;
    sales: { method: string; total: number; count: number }[];
    movements: { type: string; total: number; count: number }[];
  }>;
  currency: string;
}) {
  return (
    <section
      id="active-shifts"
      className="scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-bold">Active shifts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live drawer activity. Cashiers close and reconcile from Point of
            Sale.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
          {shifts.length} active
        </span>
      </div>
      {shifts.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  'Shift / register',
                  'Cashier',
                  'Location',
                  'Opened',
                  'Sales',
                  'Cash',
                  'Other tenders',
                  'Cash movements',
                  'Status',
                ].map((item) => (
                  <th key={item} className="px-4 py-3 font-semibold">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shifts.map((item) => {
                const cash = item.sales
                  .filter((row) => row.method === 'cash')
                  .reduce((sum, row) => sum + row.total, 0);
                const total = item.sales.reduce(
                  (sum, row) => sum + row.total,
                  0
                );
                const movements = item.movements.reduce(
                  (sum, row) =>
                    sum + (row.type === 'cash_in' ? row.total : -row.total),
                  0
                );
                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <strong>{item.sessionNo}</strong>
                      <span className="mt-0.5 block text-muted-foreground">
                        {item.terminalName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.cashierName}
                    </td>
                    <td className="px-4 py-3">{item.locationName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(item.openedAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatCurrency(total, currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(cash, currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(total - cash, currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(movements, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[0.65rem] font-bold capitalize ${item.status === 'closing' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'}`}
                      >
                        {item.status === 'closing'
                          ? 'Reconciling'
                          : item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No active shifts match the selected filters.
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  tone: 'positive' | 'warning' | 'neutral';
  href: string;
}) {
  return (
    <Link
      href={href}
      className="dashboard-metric-card group rounded-xl border px-4 py-3.5 focus-visible:ring-2 focus-visible:ring-[#d6a800]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40' : tone === 'positive' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' : 'bg-muted text-muted-foreground'}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-xs text-muted-foreground">{detail}</p>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
