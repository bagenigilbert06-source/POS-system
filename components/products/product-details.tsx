'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  PackagePlus,
} from 'lucide-react';
import type { PharmacyProduct, Product } from '@/lib/db/schema';
import { formatCurrency } from '@/lib/utils';
import { getGrossMargin } from '@/lib/pricing/gross-margin';
import { StockHistoryChart } from './stock-history-chart';
import { ProductImage } from './product-image';
import { useWorkspace } from '@/lib/context/workspace-context';
import { getProductTerminology } from '@/lib/products/terminology';

type ProductOverview = {
  product: Product;
  pharmacyMetadata: PharmacyProduct | null;
  categoryName: string | null;
  metrics: {
    unitsSoldToday: number;
    unitsSoldMonth: number;
    revenueMonth: number;
    grossProfitMonth: number;
    averageDailySales: number;
    stockValue: number;
    estimatedStockDays: number | null;
  };
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    reason: string | null;
    createdAt: Date;
  }>;
  lots: Array<{
    id: string;
    lotNumber: string;
    branchName: string;
    quantity: string;
    expiresAt: Date | null;
    status: string;
    receivedAt: Date;
    expired: boolean;
  }>;
};

export function ProductDetails({ overview }: { overview: ProductOverview }) {
  const { config } = useWorkspace();
  const terminology = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const { product, pharmacyMetadata, categoryName, metrics, movements, lots } = overview;
  const buying = Number(product.buyingPrice);
  const selling = Number(product.sellingPrice);
  const profit = selling - buying;
  const grossMargin = getGrossMargin(selling, buying);
  const status = !product.isActive
    ? 'Archived'
    : product.stock === 0
      ? 'Out of stock'
      : product.stock <= product.minStock
        ? 'Low stock'
        : 'In stock';
  const stockHistory = [...movements].reverse().map((movement) => ({
    date: movement.createdAt.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    stock: movement.stockAfter,
  }));

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {terminology.title}
      </Link>
      <section className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-sm dark:border-slate-800 dark:bg-[#121212] dark:shadow-none">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[300px_1fr]">
          <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-lg bg-[#fff8e8] text-[#8a6500] dark:bg-[#1b180d] dark:text-[#d6aa2d]">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              sizes="(max-width: 1024px) 100vw, 300px"
              priority
            />
          </div>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9a6900] dark:text-[#d6aa2d]">
                  {categoryName ?? terminology.singular}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#101828] dark:text-slate-100">
                  {product.name}
                </h1>
                {(product.brand || product.variant) && (
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {[product.brand, product.variant]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {pharmacyMetadata && <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm"><p className="font-semibold">{[pharmacyMetadata.genericName, pharmacyMetadata.strength, pharmacyMetadata.dosageForm].filter(Boolean).join(' · ') || 'Medicine details'}</p><p className="mt-1 text-xs text-muted-foreground">{[pharmacyMetadata.manufacturer, pharmacyMetadata.packSize, pharmacyMetadata.internalCode].filter(Boolean).join(' · ')}</p><div className="mt-2 flex flex-wrap gap-1.5">{pharmacyMetadata.prescriptionRequired && <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold">Prescription required</span>}{pharmacyMetadata.restrictedItem && <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">Restricted audit</span>}<span className="rounded-full border px-2 py-0.5 text-[10px] font-bold">Batch tracked</span></div></div>}
                <p className="mt-2 text-sm text-muted-foreground">
                  {product.sku ? `SKU ${product.sku}` : 'No SKU'}
                  {product.barcode ? ` · Barcode ${product.barcode}` : ''}
                  {product.unitsPerPack && product.unitsPerPack > 1
                    ? ` · Pack of ${product.unitsPerPack}`
                    : ''}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-[#edf7ef] px-3 py-1 text-xs font-medium text-[#28743c] dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-400">
                {status}
              </span>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Metric label="Selling price" value={formatCurrency(selling)} />
              <Metric label="Cost price" value={formatCurrency(buying)} />
              <Metric label="Profit per unit" value={formatCurrency(profit)} />
              <Metric
                label="Current profit %"
                value={
                  grossMargin.valid
                    ? `${grossMargin.percent.toFixed(1)}%`
                    : 'Check cost price'
                }
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Profit % uses today&apos;s cost price. Sales reports show realized
              profit using the cost captured when each sale was completed.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/products/${product.id}?edit=true`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Edit3 className="h-4 w-4" /> Edit {terminology.singularLower}
              </Link>
              <Link
                href={`/dashboard/inventory?receive=${product.id}`}
                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <PackagePlus className="h-4 w-4" /> Receive stock
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Available stock"
          value={`${product.stock} ${product.unit}`}
        />
        <Metric
          label="Units sold today"
          value={`${metrics.unitsSoldToday} ${product.unit}`}
        />
        <Metric
          label="Units sold this month"
          value={`${metrics.unitsSoldMonth} ${product.unit}`}
        />
        <Metric
          label="Revenue this month"
          value={formatCurrency(metrics.revenueMonth)}
        />
        <Metric
          label="Gross profit this month"
          value={formatCurrency(metrics.grossProfitMonth)}
        />
        <Metric
          label="Average daily sales"
          value={`${metrics.averageDailySales.toFixed(1)} ${product.unit}`}
        />
        <Metric
          label="Stock value"
          value={formatCurrency(metrics.stockValue)}
        />
        <Metric
          label="Estimated stock days"
          value={
            metrics.estimatedStockDays === null
              ? 'Not enough sales data'
              : `${metrics.estimatedStockDays.toFixed(0)} days`
          }
        />
      </section>
      <HistoryPanel title="Stock level">
        <StockHistoryChart
          data={stockHistory}
          unit={product.unit}
          alertLevel={product.minStock}
        />
      </HistoryPanel>
      {pharmacyMetadata && <HistoryPanel title="Medicine batches"><PaginatedHistory
        items={lots}
        emptyText="No medicine batches have been received yet."
        itemLabel="medicine batches"
        renderItem={(lot) => <div key={lot.id} className="flex min-h-[70px] items-start justify-between gap-3 py-3 text-sm"><div><p className="font-medium">Batch {lot.lotNumber}</p><p className="mt-1 text-xs text-muted-foreground">{lot.branchName} · received {lot.receivedAt.toLocaleDateString()}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{Number(lot.quantity)} {product.unit}</p><p className={`mt-1 text-xs ${lot.expired ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>{lot.expiresAt ? `${lot.expired ? 'Expired' : 'Expires'} ${lot.expiresAt.toLocaleDateString()}` : 'No expiry date'} · {lot.status.replaceAll('_', ' ')}</p></div></div>}
      /></HistoryPanel>}
      <section>
        <HistoryPanel title="Recent stock movements">
          <PaginatedHistory
            items={movements}
            emptyText="No stock movements recorded yet."
            itemLabel="stock movements"
            renderItem={(movement) => (
              <div
                key={movement.id}
                className="flex min-h-[70px] items-start justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {movement.type.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {movement.reason || 'No reason supplied'} ·{' '}
                    {movement.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      movement.quantity >= 0
                        ? 'font-semibold text-[#28743c]'
                        : 'font-semibold text-destructive'
                    }
                  >
                    {movement.quantity >= 0 ? '+' : ''}
                    {movement.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {movement.stockBefore} → {movement.stockAfter}
                  </p>
                </div>
              </div>
            )}
          />
        </HistoryPanel>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[#fafbfc] p-4 dark:border-slate-800 dark:bg-[#151515]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[#101828] dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
function HistoryPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-[#121212]">
      <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function EmptyHistory({ text }: { text: string }) {
  return <p className="py-5 text-sm text-muted-foreground">{text}</p>;
}

const HISTORY_PAGE_SIZE = 6;

function PaginatedHistory<T>({
  items,
  emptyText,
  itemLabel,
  renderItem,
}: {
  items: T[];
  emptyText: string;
  itemLabel: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  if (!items.length) return <EmptyHistory text={emptyText} />;

  const pageCount = Math.ceil(items.length / HISTORY_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const end = Math.min(start + HISTORY_PAGE_SIZE, items.length);

  return (
    <div>
      <div className="divide-y dark:divide-slate-800">
        {items.slice(start, end).map(renderItem)}
      </div>
      {pageCount > 1 && (
        <nav
          className="mt-3 flex items-center justify-between border-t pt-3 dark:border-slate-800"
          aria-label={`${itemLabel} pagination`}
        >
          <p className="text-xs tabular-nums text-muted-foreground">
            {start + 1}–{end} of {items.length}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {currentPage} of {pageCount}
            </span>
            <div className="inline-flex overflow-hidden rounded-lg border bg-background shadow-sm dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35"
                aria-label={`Previous ${itemLabel} page`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
                disabled={currentPage === pageCount}
                className="inline-flex h-8 w-8 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35 dark:border-slate-700"
                aria-label={`Next ${itemLabel} page`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
