'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import type { ReportSection } from '@/lib/reports/sections';

const labels: Record<ReportSection, string> = {
  overview: 'Overview',
  sales: 'Sales',
  products: 'Stock Items',
  payments: 'Payments',
  profit: 'Profit',
  inventory: 'Inventory',
  shifts: 'Shifts',
  compliance: 'Compliance',
  tax: 'Tax',
  staff: 'Staff',
};

function hrefFor(params: URLSearchParams, section: ReportSection) {
  const next = new URLSearchParams(params);
  next.set('section', section);
  return `/dashboard/reports?${next}`;
}

export function ReportTabs({
  active,
  visible,
  productLabel = 'Stock Items',
  salesLabel = 'Sales',
}: {
  active: ReportSection;
  visible: ReportSection[];
  productLabel?: string;
  salesLabel?: string;
}) {
  const params = useSearchParams();
  const [optimistic, setOptimistic] = useState(active);
  useEffect(() => setOptimistic(active), [active]);
  const likelyNext = visible[(visible.indexOf(active) + 1) % visible.length];
  return (
    <nav
      className="flex gap-5 overflow-x-auto border-b border-[var(--dashboard-border)] px-1"
      aria-label="Report sections"
    >
      {visible.map((section) => (
        <Link
          key={section}
          href={hrefFor(new URLSearchParams(params.toString()), section)}
          prefetch={section === likelyNext}
          onClick={() => setOptimistic(section)}
          aria-current={optimistic === section ? 'page' : undefined}
          className={`relative shrink-0 py-3 text-xs font-semibold transition-colors ${optimistic === section ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--dashboard-accent)]' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {section === 'products'
            ? productLabel
            : section === 'sales'
              ? salesLabel
              : labels[section]}
        </Link>
      ))}
    </nav>
  );
}

export function ReportFilters({
  period,
  from,
  to,
  today,
  branch: selectedBranch,
  locations,
}: {
  period: string;
  from: string;
  to: string;
  today: string;
  branch?: string;
  locations: { id: string; name: string }[];
}) {
  const router = useRouter(),
    pathname = usePathname(),
    current = useSearchParams();
  const [preset, setPreset] = useState(period),
    [fromValue, setFromValue] = useState(from),
    [toValue, setToValue] = useState(to),
    [branchValue, setBranchValue] = useState(selectedBranch ?? ''),
    [pending, setPending] = useState(false);
  useEffect(() => {
    setPreset(period);
    setFromValue(from);
    setToValue(to);
    setBranchValue(selectedBranch ?? '');
    setPending(false);
  }, [period, from, to, selectedBranch]);
  function apply(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(current.toString());
    params.set('period', preset);
    if (preset === 'custom') {
      params.set('from', fromValue);
      params.set('to', toValue);
    } else {
      params.delete('from');
      params.delete('to');
    }
    branchValue ? params.set('branch', branchValue) : params.delete('branch');
    setPending(true);
    startTransition(() =>
      router.push(`${pathname}?${params}`, { scroll: false })
    );
  }
  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-2 rounded-xl bg-[var(--dashboard-surface-subtle)] p-2.5"
      aria-label="Report filters"
    >
      <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Period</span>
        <select
          value={preset}
          onChange={(event) => setPreset(event.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-xs font-semibold"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {preset === 'custom' && (
        <>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>From</span>
            <input
              type="date"
              required
              max={today}
              value={fromValue}
              onChange={(event) => setFromValue(event.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-xs"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>To</span>
            <input
              type="date"
              required
              min={fromValue}
              max={today}
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-xs"
            />
          </label>
        </>
      )}
      <label className="grid min-w-44 gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Location</span>
        <select
          value={branchValue}
          onChange={(event) => setBranchValue(event.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-xs font-semibold"
        >
          <option value="">All available locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={pending}
        className="h-9 rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-xs font-bold text-[var(--dashboard-accent-cta-ink)] disabled:opacity-60"
      >
        {pending ? 'Applying…' : 'Apply'}
      </button>
    </form>
  );
}
