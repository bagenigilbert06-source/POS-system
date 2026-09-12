'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock3,
  UserRound,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatRegisterShiftDuration, registerShiftDurationMinutes } from '@/lib/pos/shift-duration';

type ShiftRecord = {
  id: string;
  sessionNo: string;
  status: string;
  openingCash: string;
  expectedCash: string | null;
  closingCash: string | null;
  variance: string | null;
  varianceReason: string | null;
  openedBy: string;
  closedBy: string | null;
  approvedByName?: string | null;
  reconciledByName?: string | null;
  reconciliationStartedBy?: string | null;
  recoveryReason?: string | null;
  recoveryNote?: string | null;
  reconciliationNote?: string | null;
  openedAt: Date;
  closedAt: Date | null;
  cashierName: string;
  terminalName: string;
  locationName: string;
  sales: { method: string; total: number; count: number }[];
  refunds: { method: string; total: number; count: number }[];
  movements: { type: string; total: number; count: number }[];
  auditEvents: {
    id: string;
    action: string;
    createdAt: Date;
    userId: string;
    metadata: unknown;
  }[];
};

export function ShiftHistory({
  shifts,
  currency,
}: {
  shifts: ShiftRecord[];
  currency: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(shifts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstRecord = shifts.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min(currentPage * pageSize, shifts.length);
  const visibleShifts = useMemo(
    () => shifts.slice(firstRecord - 1, lastRecord),
    [firstRecord, lastRecord, shifts]
  );
  const active = visibleShifts.find((shift) => shift.id === selected) ?? null;

  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [shifts]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changePage = (nextPage: number) => {
    setSelected(null);
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-white/10"
      aria-labelledby="shift-history-title"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="shift-history-title"
            className="text-xl font-semibold tracking-tight"
          >
            Shift history
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Review opening cash, reconciliations, and completed register shifts.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {shifts.length} {shifts.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      {shifts.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#f5f5f7] text-[11px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Shift</th>
                <th className="px-3 py-3 font-semibold">Cashier</th>
                <th className="px-3 py-3 font-semibold">Register / location</th>
                <th className="px-3 py-3 font-semibold">Opened / closed</th>
                <th className="px-3 py-3 text-right font-semibold">Duration</th>
                <th className="px-3 py-3 text-right font-semibold">Sales</th>
                <th className="px-3 py-3 text-right font-semibold">Expected</th>
                <th className="px-3 py-3 text-right font-semibold">Counted</th>
                <th className="px-3 py-3 text-right font-semibold">Variance</th>
                <th className="px-5 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleShifts.map((shift) => {
                const salesTotal = shift.sales.reduce(
                  (sum, row) => sum + row.total,
                  0
                );
                const open = selected === shift.id;
                return (
                  <tr
                    key={shift.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03] ${open ? 'bg-amber-50/40 dark:bg-amber-400/5' : ''}`}
                    onClick={() => setSelected(open ? null : shift.id)}
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left font-semibold"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fff7d6] text-[#9a6700] dark:bg-[rgba(255,214,10,.1)] dark:text-[#ffd60a]">
                          {open ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span>
                          <span className="block">{shift.sessionNo}</span>
                          <span className="mt-0.5 block font-normal text-muted-foreground">
                            {shift.id.slice(0, 8)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="block font-medium">
                        {shift.cashierName}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {shift.openedBy.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="block font-medium">
                        {shift.terminalName}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {shift.locationName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      <span className="block">
                        {formatDateTime(shift.openedAt)}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {shift.closedAt
                          ? formatDateTime(shift.closedAt)
                          : 'Still open'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums">
                      {shift.closedAt
                        ? formatRegisterShiftDuration(registerShiftDurationMinutes(shift.openedAt, shift.closedAt))
                        : 'Open'}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums">
                      {formatCurrency(salesTotal, currency)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      {shift.expectedCash == null
                        ? '—'
                        : formatCurrency(Number(shift.expectedCash), currency)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      {shift.closingCash == null
                        ? '—'
                        : formatCurrency(Number(shift.closingCash), currency)}
                    </td>
                    <td
                      className={`px-3 py-3.5 text-right font-semibold tabular-nums ${Number(shift.variance ?? 0) === 0 ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300'}`}
                    >
                      {shift.variance == null
                        ? '—'
                        : formatCurrency(Number(shift.variance), currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Status value={shift.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-semibold">No shifts recorded yet</p>
          <p className="text-xs text-muted-foreground">
            Completed register reconciliations will appear here.
          </p>
        </div>
      )}
      {shifts.length > 0 && (
        <nav
          aria-label="Shift history pagination"
          className="flex flex-col gap-3 border-t border-slate-200/80 bg-[#fafafa] px-6 py-3.5 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing {firstRecord}–{lastRecord} of {shifts.length}
            </span>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                  setSelected(null);
                }}
                className="h-8 rounded-md border bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs tabular-nums text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
      {active && <ShiftDetail shift={active} currency={currency} />}
    </section>
  );
}

function ShiftDetail({
  shift,
  currency,
}: {
  shift: ShiftRecord;
  currency: string;
}) {
  const sales = new Map(shift.sales.map((row) => [row.method, row]));
  const refunds = new Map(shift.refunds.map((row) => [row.method, row]));
  const movements = new Map(shift.movements.map((row) => [row.type, row]));
  return (
    <div className="border-t bg-muted/10 px-5 py-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shift detail
          </p>
          <h3 className="mt-1 text-base font-bold">
            {shift.sessionNo} · {shift.cashierName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {shift.terminalName} · {shift.locationName}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Shift ID: {shift.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" />
            Opened by {shift.cashierName}
          </span>
          {shift.closedAt && (
            <span>
              Register time {formatRegisterShiftDuration(registerShiftDurationMinutes(shift.openedAt, shift.closedAt))}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {shift.closedAt
              ? `Closed ${formatDateTime(shift.closedAt)}`
              : 'Currently open'}
          </span>
          {shift.closedAt && (
            <span>
              Reconciled by{' '}
              {shift.reconciledByName ?? shift.approvedByName ?? shift.closedBy ?? 'Not recorded'}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCard
          label="Opening float"
          value={formatCurrency(Number(shift.openingCash), currency)}
        />
        <DetailCard
          label="Expected cash"
          value={
            shift.expectedCash == null
              ? 'Not available'
              : formatCurrency(Number(shift.expectedCash), currency)
          }
        />
        <DetailCard
          label="Counted cash"
          value={
            shift.closingCash == null
              ? 'Not counted'
              : formatCurrency(Number(shift.closingCash), currency)
          }
        />
        <DetailCard
          label="Variance"
          value={
            shift.variance == null
              ? '—'
              : formatCurrency(Number(shift.variance), currency)
          }
          tone={Number(shift.variance ?? 0) === 0 ? 'positive' : 'warning'}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Breakdown
          title="Sales by payment"
          rows={Array.from(sales.entries()).map(([method, row]) => [
            `${method} (${row.count})`,
            formatCurrency(row.total, currency),
          ])}
          empty="No sales"
        />
        <Breakdown
          title="Refunds"
          rows={Array.from(refunds.entries()).map(([method, row]) => [
            `${method} (${row.count})`,
            formatCurrency(row.total, currency),
          ])}
          empty="No refunds"
        />
        <Breakdown
          title="Cash movements"
          rows={Array.from(movements.entries()).map(([type, row]) => [
            `${type.replace('_', ' ')} (${row.count})`,
            formatCurrency(row.total, currency),
          ])}
          empty="No movements"
        />
      </div>
      {shift.reconciliationNote && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
          <span className="font-semibold">Reconciliation note:</span>{' '}
          {shift.reconciliationNote}
        </div>
      )}
      {shift.recoveryReason && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-100">
          <span className="font-semibold">Manager recovery:</span>{' '}
          {shift.recoveryReason.replaceAll('_', ' ')}
          {shift.recoveryNote ? ` · ${shift.recoveryNote}` : ''}
        </div>
      )}
      {shift.varianceReason && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
          <span className="font-semibold">Variance reason:</span>{' '}
          {shift.varianceReason}
        </div>
      )}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audit events
        </p>
        {shift.auditEvents.length ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {shift.auditEvents.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="rounded-lg border bg-background px-3 py-2 text-xs"
              >
                <p className="font-semibold">
                  {event.action.replaceAll('.', ' · ')}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {formatDateTime(event.createdAt)} · {event.userId.slice(0, 8)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No audit events recorded for this shift.
          </p>
        )}
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'warning';
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${tone === 'positive' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
function Breakdown({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold">{title}</p>
      {rows.length ? (
        <div className="mt-2 space-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-xs">
              <span className="capitalize text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
function Status({ value }: { value: string }) {
  const active = value === 'open' || value === 'closing';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${value === 'closed' ? 'bg-muted text-muted-foreground' : active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700'}`}
    >
      {value.replace('_', ' ')}
    </span>
  );
}
