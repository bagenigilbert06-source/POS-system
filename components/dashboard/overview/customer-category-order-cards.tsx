'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  MapPin,
  Package,
  UsersRound,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { useMemo, useState } from 'react';

interface Props {
  currency: string;
  customers: DashboardOverview['topCustomers'];
  categories: DashboardOverview['topCategories'];
  categoriesLast7Days: DashboardOverview['topCategoriesLast7Days'];
  categoryCount: number;
  productCount: number;
  hourlySales: DashboardOverview['hourlySales'];
  reportDate: string;
}

const card =
  'overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm';
const colors = [
  'var(--dashboard-accent)',
  'var(--dashboard-success)',
  'var(--dashboard-muted)',
];
type HeatPoint = {
  x: number;
  y: number;
  value: number;
  day: string;
  hour: string;
};

function formatHour(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12} ${suffix}`;
}

function HeatCell({
  cx = 0,
  cy = 0,
  payload,
  max,
}: {
  cx?: number;
  cy?: number;
  payload?: HeatPoint;
  max: number;
}) {
  const intensity = payload ? payload.value / max : 0;
  return (
    <rect
      x={cx - 20}
      y={cy - 14}
      width={40}
      height={28}
      rx={3}
      fill="var(--dashboard-accent)"
      fillOpacity={0.14 + intensity * 0.86}
      stroke="var(--dashboard-surface)"
      strokeWidth={1.5}
    />
  );
}

function HeatTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HeatPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--dashboard-text)]">
        {point.day} · {point.hour}
      </p>
      <p className="mt-1 text-[var(--dashboard-muted)]">
        {formatNumber(point.value)}{' '}
        {point.value === 1 ? 'transaction' : 'transactions'}
      </p>
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number }>;
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--dashboard-text)]">{item.name}</p>
      <p className="mt-1 text-[var(--dashboard-muted)]">
        {formatNumber(Number(item.value ?? 0))} sales
      </p>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-xs font-bold text-[var(--dashboard-accent)]">
      {letters}
    </span>
  );
}

export function CustomerCategoryOrderCards({
  currency,
  customers,
  categories,
  categoriesLast7Days,
  categoryCount,
  productCount,
  hourlySales,
  reportDate,
}: Props) {
  const [period, setPeriod] = useState<7 | 30>(30);
  const periodStart = useMemo(() => {
    const start = new Date(`${reportDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - period + 1);
    return start.toISOString().slice(0, 10);
  }, [period, reportDate]);
  const selectedCategories = period === 7 ? categoriesLast7Days : categories;
  const heat = new Map<string, number>();
  for (const sale of hourlySales.filter((entry) => entry.date >= periodStart)) {
    const day = new Date(`${sale.date}T12:00:00`).getDay();
    const slot = Math.floor(sale.hour / 2);
    const key = `${day}:${slot}`;
    heat.set(key, (heat.get(key) ?? 0) + sale.transactions);
  }
  const maxHeat = Math.max(1, ...heat.values());
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourSlots = [18, 16, 14, 12, 10, 8, 6, 4, 2];
  const heatData: HeatPoint[] = hourSlots.flatMap((hour) =>
    days.map((day, column) => {
      const jsDay = column === 6 ? 0 : column + 1;
      return {
        x: column,
        y: hour,
        value: heat.get(`${jsDay}:${Math.floor(hour / 2)}`) ?? 0,
        day,
        hour: formatHour(hour),
      };
    })
  );

  return (
    <section
      aria-label="Customer, category and order insights"
      className="grid items-stretch gap-4 xl:grid-cols-3"
    >
      <article className={card}>
        <header className="flex h-16 items-center justify-between border-b border-[var(--dashboard-border)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <UsersRound className="h-4 w-4" />
            </span>
            <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Top Customers
            </h2>
          </div>
          <Link
            href="/dashboard/customers"
            className="group inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </header>
        {customers.length ? (
          <div className="px-5">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="grid h-[5.15rem] grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--dashboard-border)] last:border-0"
              >
                <Initials name={customer.name} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--dashboard-text)]">
                    {customer.name}
                  </p>
                  <p className="mt-1 flex items-center truncate text-[0.68rem] text-[var(--dashboard-muted)]">
                    <MapPin className="mr-1 h-3 w-3" />
                    {customer.location}
                    <span className="mx-1.5 text-[var(--dashboard-accent)]">
                      •
                    </span>
                    {formatNumber(customer.orders)} Orders
                  </p>
                </div>
                <strong className="text-sm tabular-nums text-[var(--dashboard-text)]">
                  {formatCurrency(customer.total, currency)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty message="Customer rankings appear after identified-customer sales." />
        )}
      </article>

      <article className={card}>
        <header className="flex h-16 items-center justify-between border-b border-[var(--dashboard-border)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <UsersRound className="h-4 w-4" />
            </span>
            <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Top Categories
            </h2>
          </div>
          <span
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--dashboard-accent-soft)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-accent)]"
            title="Reporting window: last 30 days"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            30 days
          </span>
        </header>
        <div className="p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
            <div className="h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="sales"
                    nameKey="name"
                    innerRadius="47%"
                    outerRadius="76%"
                    paddingAngle={3}
                    stroke="none"
                    animationDuration={450}
                  >
                    {categories.map((category, index) => (
                      <Cell
                        key={category.id}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={category.id}>
                  <p className="flex items-center gap-1.5 text-[0.68rem] text-[var(--dashboard-muted)]">
                    <i
                      className="h-2 w-1 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {category.name}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[var(--dashboard-text)]">
                    {formatNumber(category.sales)}
                    <span className="ml-1 text-xs font-normal text-[var(--dashboard-muted)]">
                      Sales
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-[var(--dashboard-text)]">
            Category Statistics
          </p>
          <dl className="mt-2 overflow-hidden rounded-lg border border-[var(--dashboard-border)]">
            <div className="flex items-center justify-between border-b border-[var(--dashboard-border)] px-3 py-2 text-xs">
              <dt className="flex items-center gap-2 text-[var(--dashboard-muted)]">
                <Boxes className="h-3 w-3 text-[var(--dashboard-accent)]" />
                Total Number Of Categories
              </dt>
              <dd className="font-bold tabular-nums">
                {formatNumber(categoryCount)}
              </dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-xs">
              <dt className="flex items-center gap-2 text-[var(--dashboard-muted)]">
                <Package className="h-3 w-3 text-[var(--dashboard-accent)]" />
                Total Number Of Products
              </dt>
              <dd className="font-bold tabular-nums">
                {formatNumber(productCount)}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <article className={card}>
        <header className="flex h-16 items-center justify-between border-b border-[var(--dashboard-border)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <Boxes className="h-4 w-4" />
            </span>
            <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Order Statistics
            </h2>
          </div>
          <span
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--dashboard-accent-soft)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-accent)]"
            title="Reporting window: last 30 days"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            30 days
          </span>
        </header>
        <div className="h-[25.7rem] px-3 pb-4 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={[-0.5, 6.5]}
                ticks={[0, 1, 2, 3, 4, 5, 6]}
                tickFormatter={(value) => days[value] ?? ''}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--dashboard-text)', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[1, 19]}
                ticks={[2, 4, 6, 8, 10, 12, 14, 16, 18]}
                tickFormatter={formatHour}
                axisLine={false}
                tickLine={false}
                width={52}
                tick={{ fill: 'var(--dashboard-text)', fontSize: 9 }}
              />
              <ZAxis type="number" dataKey="value" range={[1, 1]} />
              <Tooltip cursor={false} content={<HeatTooltip />} />
              <Scatter
                data={heatData}
                shape={<HeatCell max={maxHeat} />}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[25.7rem] items-center justify-center px-8 text-center text-xs leading-5 text-[var(--dashboard-muted)]">
      {message}
    </div>
  );
}
