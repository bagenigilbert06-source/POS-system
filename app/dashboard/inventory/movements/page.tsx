import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { getInventoryMovements } from '@/app/actions/stock-adjustments';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { MovementExportButton } from '@/components/inventory/movement-export-button';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { getCurrentProductTerminology } from '@/lib/products/current-terminology';

export const metadata: Metadata = {
  title: 'Inventory movement ledger | Pesaby',
};
export const dynamic = 'force-dynamic';

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    branchId?: string;
    movementType?: string;
    userId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const query = (await searchParams) ?? {};
  const [data, terminology] = await Promise.all([getInventoryMovements({
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 25),
    search: query.search || undefined,
    branchId: query.branchId || undefined,
    movementType: query.movementType || undefined,
    userId: query.userId || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  }), getCurrentProductTerminology()]);
  const href = (page: number) => {
    const values = new URLSearchParams({
      page: String(page),
      pageSize: String(data.pagination.pageSize),
    });
    for (const key of [
      'search',
      'branchId',
      'movementType',
      'userId',
      'from',
      'to',
    ] as const)
      if (query[key]) values.set(key, query[key]!);
    return `/dashboard/inventory/movements?${values.toString()}`;
  };
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-10">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inventory
      </Link>
      <DashboardPageHeading
        theme="adaptive"
        icon={History}
        eyebrow="Inventory control"
        title="Movement ledger"
        description="Search and audit every stock-changing event across permitted locations."
        action={
          data.canExport ? (
            <MovementExportButton
              filters={{
                search: query.search || undefined,
                branchId: query.branchId || undefined,
                movementType: query.movementType || undefined,
                userId: query.userId || undefined,
                from: query.from || undefined,
                to: query.to || undefined,
              }}
            />
          ) : undefined
        }
      />
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <form
          method="get"
          className="grid gap-2 border-b p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_170px_145px_145px_105px_auto]"
        >
          <input
            name="search"
            defaultValue={query.search || ''}
            placeholder={`${terminology.singular}, SKU, barcode or reference`}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <select
            name="branchId"
            defaultValue={query.branchId || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All locations</option>
            {data.branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            name="movementType"
            defaultValue={query.movementType || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All movement types</option>
            {data.movementTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select
            name="userId"
            defaultValue={query.userId || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All users</option>
            {data.users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            name="from"
            type="date"
            defaultValue={query.from || ''}
            aria-label="Start date"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            name="to"
            type="date"
            defaultValue={query.to || ''}
            aria-label="End date"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <select
            name="pageSize"
            defaultValue={String(data.pagination.pageSize)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Apply
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/inventory/movements">Clear</Link>
            </Button>
          </div>
        </form>
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">{terminology.singular}</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Movement</th>
                  <th className="px-4 py-3 text-right font-semibold">Change</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Balance
                  </th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map(
                  ({ movement, sku, barcode, branchName, userName }) => {
                    const saleLink =
                      movement.referenceType === 'sale' && movement.referenceId;
                    return (
                      <tr key={movement.id} className="hover:bg-muted/20">
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                          {formatDateTime(movement.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/inventory/${movement.productId}`}
                            className="font-semibold hover:text-primary hover:underline"
                          >
                            {movement.productName}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {sku || 'No SKU'}
                            {barcode ? ` · ${barcode}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">{branchName || 'Unknown'}</td>
                        <td className="px-4 py-3 capitalize">
                          {movement.type.replaceAll('_', ' ')}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold tabular-nums ${movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {movement.quantity > 0 ? '+' : ''}
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {movement.stockBefore} →{' '}
                          <strong>{movement.stockAfter}</strong>
                        </td>
                        <td className="px-4 py-3">
                          {userName || 'Unknown user'}
                        </td>
                        <td className="max-w-xs px-5 py-3 text-xs">
                          <p className="truncate text-muted-foreground">
                            {movement.reason || 'No note'}
                          </p>
                          {saleLink ? (
                            <Link
                              href={`/dashboard/sales/${movement.referenceId}`}
                              className="mt-0.5 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                              {movement.referenceId}
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          ) : movement.referenceId ? (
                            <span className="mt-0.5 block font-semibold">
                              {movement.referenceId}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No stock movements match these filters.
          </div>
        )}
        <nav className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {data.pagination.total
              ? `Showing ${(data.pagination.page - 1) * data.pagination.pageSize + 1}–${Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of ${data.pagination.total}`
              : '0 movements'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              asChild={data.pagination.page > 1}
              variant="outline"
              size="sm"
              disabled={data.pagination.page <= 1}
            >
              {data.pagination.page > 1 ? (
                <Link href={href(data.pagination.page - 1)}>
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
            <span className="px-2 text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.pageCount}
            </span>
            <Button
              asChild={data.pagination.page < data.pagination.pageCount}
              variant="outline"
              size="sm"
              disabled={data.pagination.page >= data.pagination.pageCount}
            >
              {data.pagination.page < data.pagination.pageCount ? (
                <Link href={href(data.pagination.page + 1)}>
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
