'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Coffee,
  LogIn,
  LogOut,
  Play,
  CalendarDays,
  Clock3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  clockIn,
  clockOut,
  correctAttendance,
  endBreak,
  startBreak,
} from '@/app/actions/attendance';
import { formatDuration } from '@/lib/attendance/calculations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  clockInAt: string;
  clockOutAt: string | null;
  breakMs: number;
  workedMs: number;
  name: string;
  branch: string;
};
export function AttendanceDashboard({
  name,
  timezone,
  state,
  rows,
  managerView,
  canCorrect,
  activePeople,
}: {
  name: string;
  timezone: string;
  state: 'not_clocked_in' | 'working' | 'on_break' | 'clocked_out';
  rows: AttendanceRow[];
  managerView: boolean;
  canCorrect: boolean;
  activePeople: Array<{ name: string; status: string; clockInAt: string }>;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [pending, startTransition] = useTransition();
  const [range, setRange] = useState<'week' | 'month' | 'custom'>('month');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [correctionRow, setCorrectionRow] = useState<AttendanceRow | null>(
    null
  );
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionClockIn, setCorrectionClockIn] = useState('');
  const [correctionClockOut, setCorrectionClockOut] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateTime = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);
  const greeting =
    now.getHours() < 12
      ? 'Good morning'
      : now.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (status === 'all' || row.status === status) &&
          (range === 'month' ||
            range === 'custom' ||
            new Date(row.clockInAt).getTime() >= now.getTime() - 7 * 864e5) &&
          (!fromDate || row.date >= fromDate) &&
          (!toDate || row.date <= toDate) &&
          `${row.name} ${row.date}`.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, status, range, now, query, fromDate, toDate]
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const pageRows = filtered.slice((page - 1) * 10, page * 10);
  const present = new Set(
    rows
      .filter((row) => row.status !== 'clocked_out' || row.clockOutAt)
      .map((row) => row.date)
  ).size;
  const invoke = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok ? null : (result.error ?? 'Unable to update attendance')
      );
      if (result.ok) router.refresh();
    });
  const localInput = (value: string | null) =>
    value ? new Date(value).toISOString().slice(0, 16) : '';
  const openCorrection = (row: AttendanceRow) => {
    setCorrectionRow(row);
    setCorrectionReason('');
    setCorrectionClockIn(localInput(row.clockInAt));
    setCorrectionClockOut(localInput(row.clockOutAt));
    setCorrectionError(null);
  };
  const submitCorrection = () => {
    if (!correctionRow || correctionReason.trim().length < 3) {
      setCorrectionError('Enter a correction reason of at least 3 characters.');
      return;
    }
    const clockIn = new Date(correctionClockIn),
      clockOut = correctionClockOut ? new Date(correctionClockOut) : null;
    if (
      Number.isNaN(clockIn.getTime()) ||
      (clockOut && Number.isNaN(clockOut.getTime()))
    ) {
      setCorrectionError('Enter valid clock-in and clock-out times.');
      return;
    }
    startTransition(async () => {
      const result = await correctAttendance({
        attendanceId: correctionRow.id,
        clockInAt: clockIn.toISOString(),
        clockOutAt: clockOut?.toISOString() ?? null,
        reason: correctionReason.trim(),
      });
      if (!result.ok) {
        setCorrectionError(result.error);
        return;
      }
      setCorrectionRow(null);
      router.refresh();
    });
  };
  const stateLabel = {
    not_clocked_in: 'Not clocked in',
    working: 'Working',
    on_break: 'On break',
    clocked_out: 'Clocked out',
  }[state];
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex items-center gap-3 px-1">
        <CalendarDays className="h-5 w-5 text-[#b57900]" />
        <div>
          <p className="!m-0 !text-[11px] font-bold uppercase tracking-[.12em] text-[#b57900]">
            Staff & access
          </p>
          <h1 className="!m-0 !text-[20px] font-bold leading-7 text-[var(--dashboard-text)]">
            Attendance
          </h1>
        </div>
      </div>
      <section className="grid gap-4 lg:grid-cols-[390px_1fr]">
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-[#161616]">
          <div className="flex items-center justify-between border-b pb-3">
            <p className="!m-0 !text-[16px] font-bold">
              {greeting}, {name}
            </p>
            <span className="text-xs font-semibold text-[#7251d4]">
              {new Intl.DateTimeFormat(undefined, {
                timeZone: timezone,
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }).format(now)}
            </span>
          </div>
          <div className="flex items-center gap-3 py-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff1c7] text-[#b57900]">
              <Clock3 className="h-6 w-6" />
            </span>
            <div>
              <p className="!m-0 text-[23px] font-bold leading-6 tabular-nums">
                {new Intl.DateTimeFormat(undefined, {
                  timeZone: timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(now)}
              </p>
              <p className="!m-0 mt-1 text-xs text-[var(--dashboard-muted)]">
                Current time · {stateLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {state === 'not_clocked_in' || state === 'clocked_out' ? (
              <Button
                icon={LogIn}
                label="Clock in"
                onClick={() => invoke(clockIn)}
                pending={pending}
              />
            ) : null}
            {state === 'working' ? (
              <>
                <Button
                  icon={Coffee}
                  label="Start break"
                  onClick={() => invoke(startBreak)}
                  pending={pending}
                  soft
                />
                <Button
                  icon={LogOut}
                  label="Clock out"
                  onClick={() => invoke(clockOut)}
                  pending={pending}
                  danger
                />
              </>
            ) : null}
            {state === 'on_break' ? (
              <Button
                icon={Play}
                label="End break"
                onClick={() => invoke(endBreak)}
                pending={pending}
              />
            ) : null}
          </div>
          {message ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {message}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-[#161616]">
          <p className="!m-0 !text-[16px] font-bold">
            Days overview this month
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric
              label="Working days"
              value={String(present)}
              icon={CalendarDays}
            />
            <Metric
              label="Present days"
              value={String(present)}
              icon={Clock3}
            />
            <Metric label="Absent days" value="—" icon={CalendarDays} />
            <Metric label="Half days" value="—" icon={Coffee} />
            <Metric label="Late days" value="—" icon={Clock3} />
            <Metric
              label="Worked hours"
              value={formatDuration(
                rows.reduce((sum, row) => sum + row.workedMs, 0)
              )}
              icon={Coffee}
            />
          </div>
          <p className="mt-4 text-xs text-[var(--dashboard-muted)]">
            Late, absent and half-day figures appear when schedules and
            work-hour policies are configured.
          </p>
        </div>
      </section>
      {managerView ? (
        <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-[#161616]">
          <p className="!m-0 !text-[16px] font-bold">Team overview</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activePeople.length ? (
              activePeople.map((person) => (
                <div
                  key={person.name}
                  className="rounded-lg bg-[var(--dashboard-surface-subtle)] p-3"
                >
                  <p className="!m-0 text-sm font-semibold">{person.name}</p>
                  <p className="!m-0 mt-1 text-xs text-[var(--dashboard-muted)]">
                    {person.status} ·{' '}
                    {new Date(person.clockInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--dashboard-muted)]">
                No staff are currently clocked in.
              </p>
            )}
          </div>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-[#161616]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search attendance"
            className="h-9 w-52 rounded-lg border px-3 text-xs outline-none focus:border-[#b57900]"
          />
          <div className="flex gap-2">
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value as 'week' | 'month' | 'custom');
                setPage(1);
              }}
              className="h-9 rounded-lg border px-3 text-xs"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>
            {range === 'custom' ? (
              <>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border px-2 text-xs"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border px-2 text-xs"
                  aria-label="To date"
                />
              </>
            ) : null}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border px-3 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="working">Working</option>
              <option value="on_break">On break</option>
              <option value="clocked_out">Clocked out</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-[13px]">
            <thead className="bg-[var(--dashboard-surface-subtle)] text-[11px] uppercase text-[var(--dashboard-muted)]">
              <tr>
                {managerView ? <th className="px-5 py-3">Employee</th> : null}
                <th className="px-5 py-3">Date</th>
                <th>Status</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>Production</th>
                <th>Break</th>
                <th>Overtime</th>
                <th>Progress</th>
                <th>Total hours</th>
                {canCorrect ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t">
                  {managerView ? (
                    <td className="px-5 py-3 font-medium">{row.name}</td>
                  ) : null}
                  <td className="px-5 py-3">
                    {new Date(`${row.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                  </td>
                  <td>
                    <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      {row.status === 'clocked_out'
                        ? 'Present'
                        : row.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {new Date(row.clockInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    {row.clockOutAt
                      ? new Date(row.clockOutAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td>{formatDuration(row.workedMs)}</td>
                  <td>{formatDuration(row.breakMs)}</td>
                  <td>—</td>
                  <td>
                    <span
                      title="Progress requires a configured work-hour policy"
                      className="block h-1.5 w-28 rounded-full bg-slate-200"
                    />
                  </td>
                  <td>{formatDuration(row.workedMs)}</td>
                  {canCorrect ? (
                    <td>
                      <button
                        onClick={() => openCorrection(row)}
                        className="rounded border px-2 py-1 text-[11px] font-semibold text-[#0f2f4d] hover:bg-slate-50"
                      >
                        Correct
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td
                    className="p-8 text-center text-[var(--dashboard-muted)]"
                    colSpan={(managerView ? 10 : 9) + (canCorrect ? 1 : 0)}
                  >
                    No attendance records in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-[var(--dashboard-muted)]">
          <span>{filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <Dialog
        open={Boolean(correctionRow)}
        onOpenChange={(open) => {
          if (!open && !pending) setCorrectionRow(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Correct attendance</DialogTitle>
            <DialogDescription>
              Changes are saved with your name, the previous values, and the
              reason for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-sm font-medium">
              Clock in
              <input
                type="datetime-local"
                value={correctionClockIn}
                onChange={(e) => setCorrectionClockIn(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Clock out{' '}
              <span className="font-normal text-[var(--dashboard-muted)]">
                (leave blank if active)
              </span>
              <input
                type="datetime-local"
                value={correctionClockOut}
                onChange={(e) => setCorrectionClockOut(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Reason
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                rows={3}
                placeholder="Explain the correction"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            {correctionError ? (
              <p role="alert" className="text-sm text-red-600">
                {correctionError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button
              disabled={pending}
              onClick={() => setCorrectionRow(null)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={pending}
              onClick={submitCorrection}
              className="rounded-lg bg-[#f9b21d] px-4 py-2 text-sm font-bold text-[#241d00] disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save correction'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Button({
  icon: Icon,
  label,
  onClick,
  pending,
  soft,
  danger,
}: {
  icon: typeof LogIn;
  label: string;
  onClick: () => void;
  pending: boolean;
  soft?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      disabled={pending}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60 ${danger ? 'bg-red-600 text-white' : soft ? 'bg-[#0f2f4d] text-white' : 'bg-[#f9b21d] text-[#241d00]'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="rounded-lg bg-[var(--dashboard-surface-subtle)] p-3">
      <Icon className="h-4 w-4 text-[#b57900]" />
      <p className="!m-0 mt-2 text-xs text-[var(--dashboard-muted)]">{label}</p>
      <p className="!m-0 mt-1 text-[18px] font-bold leading-5">{value}</p>
    </div>
  );
}
