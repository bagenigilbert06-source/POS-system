import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Boxes,
  BarChart3,
  Clock3,
  MapPin,
  PackagePlus,
  Pencil,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { getInventoryProductDetails } from '@/app/actions/stock-adjustments';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/products/product-image';
import { inventoryStatus } from '@/lib/inventory/rules';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Inventory product details | Pesaby',
};
export const dynamic = 'force-dynamic';

export default async function InventoryProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<{
    movementPage?: string;
    movementPageSize?: string;
    movementType?: string;
    movementFrom?: string;
    movementTo?: string;
    reference?: string;
  }>;
}) {
  const { productId } = await params;
  const query = (await searchParams) ?? {};
  const [{ organization }, details] = await Promise.all([
    requireWorkspaceModule('inventory'),
    getInventoryProductDetails(productId, {
      page: Number(query.movementPage || 1),
      pageSize: Number(query.movementPageSize || 10),
      movementType: query.movementType || undefined,
      from: query.movementFrom || undefined,
      to: query.movementTo || undefined,
      reference: query.reference || undefined,
    }),
  ]);
  if (!details) notFound();

  const {
    product,
    categoryName,
    locations,
    balances,
    movements,
    movementTypes,
    movementPagination,
    demand30Days,
    canReceive,
    canEditProduct,
  } = details;
  const movementHref = (page: number) => {
    const values = new URLSearchParams();
    values.set('movementPage', String(page));
    values.set('movementPageSize', String(movementPagination.pageSize));
    if (query.movementType) values.set('movementType', query.movementType);
    if (query.movementFrom) values.set('movementFrom', query.movementFrom);
    if (query.movementTo) values.set('movementTo', query.movementTo);
    if (query.reference) values.set('reference', query.reference);
    return `/dashboard/inventory/${productId}?${values.toString()}#movements`;
  };
  const balancesByBranch = new Map(
    balances.map((item) => [item.branchId, item])
  );
  const onHand = balances.reduce((sum, item) => sum + Number(item.onHand), 0);
  const reserved = balances.reduce(
    (sum, item) => sum + Number(item.reserved),
    0
  );
  const unavailable = balances.reduce(
    (sum, item) => sum + Number(item.unavailable),
    0
  );
  const incoming = balances.reduce(
    (sum, item) => sum + Number(item.incoming),
    0
  );
  const available = Math.max(0, onHand - reserved - unavailable);
  const reorderLevel =
    balances.reduce(
      (sum, item) => sum + Number(item.reorderPoint ?? product.minStock),
      0
    ) || Number(product.minStock);
  const coverDays = demand30Days > 0 ? (available / demand30Days) * 30 : null;
  const status = inventoryStatus(available, reorderLevel);
  const unitLabel = product.unit || 'unit';

  const cards = [
    {
      label: 'Available',
      value: `${available} ${unitLabel}`,
      detail: `${onHand} on hand`,
      icon: Boxes,
    },
    {
      label: '30-day sales',
      value: `${demand30Days} ${unitLabel}`,
      detail:
        coverDays === null
          ? 'No recent demand'
          : `${Math.round(coverDays)} days of cover`,
      icon: BarChart3,
    },
    {
      label: 'Reorder level',
      value: `${reorderLevel} ${unitLabel}`,
      detail:
        status === 'healthy'
          ? 'Stock is above alert level'
          : 'Restock attention required',
      icon: ShieldCheck,
    },
    {
      label: 'Stock value',
      value: formatCurrency(
        onHand * Number(product.buyingPrice),
        organization.currency
      ),
      detail: `${formatCurrency(Number(product.buyingPrice), organization.currency)} cost per ${unitLabel}`,
      icon: WalletCards,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 pb-10">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inventory
      </Link>
      <DashboardPageHeading
        theme="adaptive"
        icon={Boxes}
        eyebrow="Inventory product"
        title={product.name}
        description="Stock position, location balances and movement history."
        action={
          <div className="flex flex-wrap gap-2">
            {canEditProduct && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/products/${product.id}?edit=true`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit product
                </Link>
              </Button>
            )}
            {canReceive && (
              <Button asChild>
                <Link href={`/dashboard/inventory?receive=${product.id}`}>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Receive stock
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[150px_1fr] md:p-5">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            sizes="150px"
            priority
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {!product.isActive && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight">
            {product.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              product.brand,
              product.variant,
              categoryName,
              product.volume
                ? `${Number(product.volume)} ${product.volumeUnit || ''}`
                : null,
              product.sku ? `SKU ${product.sku}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Base unit:</span>{' '}
              <strong className="capitalize">{unitLabel}</strong>
            </p>
            {product.unitsPerPack && product.unitsPerPack > 1 && (
              <p>
                <span className="text-muted-foreground">Pack conversion:</span>{' '}
                <strong>
                  {product.unitsPerPack} {unitLabel}/case
                </strong>
              </p>
            )}
            {product.barcode && (
              <p>
                <span className="text-muted-foreground">Barcode:</span>{' '}
                <strong>{product.barcode}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article
            key={label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>

      <section
        id="movements"
        className="scroll-mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="border-b px-5 py-4">
          <h2 className="font-bold">Stock by location</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Balances shown only for locations you can access.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 text-right font-semibold">On hand</th>
                <th className="px-4 py-3 text-right font-semibold">Reserved</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Unavailable
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Available
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Incoming transfer
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Reorder at
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {locations.map((location) => {
                const balance = balancesByBranch.get(location.id);
                const locationOnHand = Number(balance?.onHand ?? 0);
                const locationReserved = Number(balance?.reserved ?? 0);
                const locationUnavailable = Number(balance?.unavailable ?? 0);
                return (
                  <tr key={location.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {location.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {locationOnHand}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {locationReserved}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {locationUnavailable}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                      {Math.max(
                        0,
                        locationOnHand - locationReserved - locationUnavailable
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-blue-600">
                      {Number(balance?.incoming ?? 0)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {Number(balance?.reorderPoint ?? product.minStock)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="font-bold">Recent movements</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest sales, receipts, returns, counts and adjustments.
            </p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <form
          method="get"
          className="grid gap-2 border-b bg-muted/10 px-5 py-3 sm:grid-cols-2 xl:grid-cols-[170px_150px_150px_1fr_110px_auto]"
        >
          <select
            name="movementType"
            defaultValue={query.movementType || ''}
            aria-label="Movement type"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All movement types</option>
            {movementTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <input
            name="movementFrom"
            type="date"
            defaultValue={query.movementFrom || ''}
            aria-label="Movement start date"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            name="movementTo"
            type="date"
            defaultValue={query.movementTo || ''}
            aria-label="Movement end date"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            name="reference"
            defaultValue={query.reference || ''}
            maxLength={120}
            placeholder="Search reference or note"
            aria-label="Movement reference"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <select
            name="movementPageSize"
            defaultValue={String(movementPagination.pageSize)}
            aria-label="Rows per page"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="10">10 rows</option>
            <option value="20">20 rows</option>
            <option value="50">50 rows</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" className="flex-1">
              Apply
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link href={`/dashboard/inventory/${productId}#movements`}>
                Clear
              </Link>
            </Button>
          </div>
        </form>
        {movements.length ? (
          <div className="divide-y">
            {movements.map((movement) => {
              const reference =
                movement.referenceId && movement.referenceType === 'sale' ? (
                  <Link
                    href={`/dashboard/sales/${movement.referenceId}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    {movement.reason || movement.referenceId}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span>
                    {movement.reason || movement.referenceId || 'No reference'}
                  </span>
                );
              return (
                <article
                  key={movement.id}
                  className="grid gap-2 px-5 py-3.5 sm:grid-cols-[150px_1fr_120px_120px] sm:items-center"
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(movement.createdAt)}
                  </p>
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {movement.type.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {reference}
                    </p>
                  </div>
                  <p
                    className={`text-right font-bold tabular-nums ${movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {movement.quantity > 0 ? '+' : ''}
                    {movement.quantity} {unitLabel}
                  </p>
                  <p className="text-right text-xs tabular-nums text-muted-foreground">
                    {movement.stockBefore} →{' '}
                    <strong className="text-foreground">
                      {movement.stockAfter}
                    </strong>
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No stock movements match the selected filters.
          </div>
        )}
        <nav
          aria-label="Movement pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
        >
          <p className="text-xs tabular-nums text-muted-foreground">
            {movementPagination.total
              ? `Showing ${(movementPagination.page - 1) * movementPagination.pageSize + 1}–${Math.min(movementPagination.page * movementPagination.pageSize, movementPagination.total)} of ${movementPagination.total}`
              : '0 movements'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              asChild={movementPagination.page > 1}
              variant="outline"
              size="sm"
              disabled={movementPagination.page <= 1}
            >
              {movementPagination.page > 1 ? (
                <Link href={movementHref(movementPagination.page - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </span>
              )}
            </Button>
            <span className="px-2 text-xs tabular-nums text-muted-foreground">
              Page {movementPagination.page} of {movementPagination.pageCount}
            </span>
            <Button
              asChild={movementPagination.page < movementPagination.pageCount}
              variant="outline"
              size="sm"
              disabled={movementPagination.page >= movementPagination.pageCount}
            >
              {movementPagination.page < movementPagination.pageCount ? (
                <Link href={movementHref(movementPagination.page + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              ) : (
                <span>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </nav>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: 'healthy' | 'low' | 'out' }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === 'healthy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : status === 'low' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}
    >
      {status === 'healthy'
        ? 'In stock'
        : status === 'low'
          ? 'Low stock'
          : 'Out of stock'}
    </span>
  );
}
