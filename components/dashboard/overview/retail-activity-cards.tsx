'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays,
  Package,
  ReceiptText,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service';
import type { ProductTerminology } from '@/lib/products/terminology';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

type Period = 1 | 7 | 30;

interface RetailActivityCardsProps {
  currency: string;
  reportDate: string;
  productSales: DashboardOverview['productSales'];
  lowStockProducts: DashboardOverview['lowStockProducts'];
  recentSales: DashboardOverview['recentSales'];
  terminology: ProductTerminology;
}

const card =
  'flex min-h-[25rem] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm';

function periodStart(reportDate: string, period: Period) {
  const date = new Date(`${reportDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - period + 1);
  return date.toISOString().slice(0, 10);
}

function compactProductId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1)
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return String(100000 + (hash % 900000));
}

function EmptyRows({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center text-xs leading-5 text-[var(--dashboard-muted)]">
      {message}
    </div>
  );
}

function ProductPicture({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  return (
    <span className="relative flex h-[50px] w-[50px] shrink-0 overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="50px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <Package
          className="m-auto h-5 w-5 text-[var(--dashboard-muted)]"
          aria-label={name}
        />
      )}
    </span>
  );
}

export function RetailActivityCards({
  currency,
  reportDate,
  productSales,
  lowStockProducts,
  recentSales,
  terminology,
}: RetailActivityCardsProps) {
  const [period, setPeriod] = useState<Period>(30);
  const topProducts = useMemo(() => {
    const from = periodStart(reportDate, period);
    const totals = new Map<
      string,
      {
        id: string;
        name: string;
        imageUrl: string | null;
        quantity: number;
        revenue: number;
      }
    >();
    for (const item of productSales) {
      if (item.date < from || item.date > reportDate) continue;
      const current = totals.get(item.productId) ?? {
        id: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.revenue;
      if (!current.imageUrl && item.imageUrl) current.imageUrl = item.imageUrl;
      totals.set(item.productId, current);
    }
    return [...totals.values()]
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 5);
  }, [period, productSales, reportDate]);
  const leadingRevenue = Math.max(
    1,
    ...topProducts.map((item) => item.revenue)
  );

  return (
    <section
      aria-label="Product and sales activity"
      className="grid items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3"
    >
      <article className={card}>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--dashboard-border)] px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <Package className="h-4 w-4" />
            </span>
            <h2 className="truncate text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Top Selling Products
            </h2>
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sales period</span>
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--dashboard-muted)]" />
            <select
              value={period}
              onChange={(event) =>
                setPeriod(Number(event.target.value) as Period)
              }
              className="h-8 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] pl-7 pr-7 text-[0.68rem] font-semibold text-[var(--dashboard-text)] outline-none"
            >
              <option value={1}>Today</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
        </header>
        {topProducts.length ? (
          <div className="px-5">
            {topProducts.map((item) => {
              const performance = Math.max(
                1,
                Math.round((item.revenue / leadingRevenue) * 100)
              );
              return (
                <div
                  key={item.id}
                  className="grid h-[4.6rem] grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--dashboard-border)] last:border-b-0"
                >
                  <ProductPicture imageUrl={item.imageUrl} name={item.name} />
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-semibold text-[var(--dashboard-text)]"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="mt-1 truncate text-[0.7rem] text-[var(--dashboard-muted)]">
                      <span className="font-medium text-[var(--dashboard-text)]">
                        {formatCurrency(item.revenue, currency)}
                      </span>
                      <span className="mx-1.5 text-[var(--dashboard-accent)]">
                        •
                      </span>
                      {formatNumber(item.quantity)}+ Sales
                    </p>
                  </div>
                  <span className="inline-flex h-5 min-w-[3.1rem] items-center justify-center rounded-md border border-emerald-400 px-1.5 text-[0.58rem] font-semibold leading-none text-emerald-600">
                    ↗ {performance}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyRows
            message={`Top-selling ${terminology.pluralLower} will appear after completed sales.`}
          />
        )}
      </article>

      <article className={card}>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--dashboard-border)] px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <TriangleAlert className="h-4 w-4" />
            </span>
            <h2 className="truncate text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Low Stock Products
            </h2>
          </div>
          <Link
            href="/dashboard/inventory"
            className="shrink-0 text-xs font-medium text-[var(--dashboard-text)] underline underline-offset-2 hover:text-[var(--dashboard-accent)]"
          >
            View All
          </Link>
        </header>
        {lowStockProducts.length ? (
          <div className="px-5">
            {lowStockProducts.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid h-[4.6rem] grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--dashboard-border)] last:border-b-0"
              >
                <ProductPicture imageUrl={item.imageUrl} name={item.name} />
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-semibold text-[var(--dashboard-text)]"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="mt-1 truncate text-[0.7rem] text-[var(--dashboard-muted)]">
                    ID : #{compactProductId(item.id)}
                  </p>
                </div>
                <div className="min-w-[3rem] text-right">
                  <p className="text-[0.68rem] text-[var(--dashboard-muted)]">
                    Instock
                  </p>
                  <p className="mt-1 text-xs font-semibold tabular-nums text-[var(--dashboard-accent)]">
                    {String(Math.max(0, Math.round(item.stock))).padStart(
                      2,
                      '0'
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyRows
            message={`No low-stock ${terminology.pluralLower}. Inventory levels are healthy.`}
          />
        )}
      </article>

      <article className={cn(card, 'lg:col-span-2 xl:col-span-1')}>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--dashboard-border)] px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
              <ReceiptText className="h-4 w-4" />
            </span>
            <h2 className="truncate text-[0.95rem] font-bold text-[var(--dashboard-text)]">
              Recent Sales
            </h2>
          </div>
          <Link
            href="/dashboard/sales"
            className="shrink-0 text-xs font-medium text-[var(--dashboard-text)] underline underline-offset-2 hover:text-[var(--dashboard-accent)]"
          >
            View All
          </Link>
        </header>
        {recentSales.length ? (
          <div className="px-5">
            {recentSales.slice(0, 5).map((sale) => {
              const normalized = sale.status.toLowerCase();
              const statusClass =
                normalized.includes('cancel') || normalized.includes('refund')
                  ? 'border border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]'
                  : normalized.includes('hold') ||
                      normalized.includes('pending') ||
                      normalized.includes('process')
                    ? 'border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
                    : 'border border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]';
              const dateLabel =
                sale.createdAt.toISOString().slice(0, 10) === reportDate
                  ? 'Today'
                  : sale.createdAt.toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
              return (
                <div
                  key={sale.id}
                  className="grid h-[4.6rem] grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--dashboard-border)] last:border-b-0"
                >
                  <ProductPicture
                    imageUrl={sale.imageUrl}
                    name={sale.productName ?? sale.receiptNo}
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-semibold text-[var(--dashboard-text)]"
                      title={sale.productName ?? sale.receiptNo}
                    >
                      {sale.productName ?? sale.receiptNo}
                    </p>
                    <p className="mt-1 truncate text-[0.7rem] text-[var(--dashboard-muted)]">
                      {sale.categoryName ??
                        sale.paymentMethod.replace(/_/g, ' ')}
                      <span className="mx-1.5 text-[var(--dashboard-accent)]">
                        •
                      </span>
                      <span className="font-medium text-[var(--dashboard-text)]">
                        {formatCurrency(sale.total, currency)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap text-[0.68rem] text-[var(--dashboard-muted)]">
                      {dateLabel}
                    </p>
                    <span
                      className={cn(
                        'mt-1.5 inline-flex h-5 items-center rounded px-2 text-[0.58rem] font-bold capitalize',
                        statusClass
                      )}
                    >
                      {sale.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyRows message="Recent completed sales will appear here automatically." />
        )}
      </article>
    </section>
  );
}
