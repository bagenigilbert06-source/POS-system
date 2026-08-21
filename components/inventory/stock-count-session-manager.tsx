'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Save,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveStockAdjustment,
  exportStockCountSessionCsv,
  rejectStockAdjustment,
  saveStockCountLine,
  submitStockCountSession,
} from '@/app/actions/stock-adjustments';
import { ProductImage } from '@/components/products/product-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

type CountLine = {
  item: {
    id: string;
    productId: string;
    productName: string;
    quantityBefore: number;
    quantityAfter: number;
    variance: number;
    countedAt: Date | null;
    notes: string | null;
  };
  product: {
    id: string;
    sku: string | null;
    barcode: string | null;
    unit: string;
    buyingPrice: string;
    imageUrl: string | null;
  };
};

export function StockCountSessionManager({
  session,
  items,
  progress,
  pagination,
  canEdit,
  canApprove,
  canExport,
  currency,
  search,
}: {
  session: { id: string; status: string; blindCount: boolean };
  items: CountLine[];
  progress: { total: number; counted: number; variance: number };
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
  canEdit: boolean;
  canApprove: boolean;
  canExport: boolean;
  currency: string;
  search: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const percent = progress.total
    ? Math.round((progress.counted / progress.total) * 100)
    : 0;
  const editable = canEdit && ['draft', 'in_progress'].includes(session.status);
  const reviewable = ['pending', 'submitted', 'under_review'].includes(
    session.status
  );
  const href = (page: number) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
    });
    if (search) query.set('search', search);
    return `/dashboard/inventory/counts/${session.id}?${query.toString()}`;
  };
  const run = (action: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Count action failed'
        );
      }
    });

  return (
    <>
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">Counting progress</span>
              <span className="font-bold tabular-nums">
                {progress.counted} / {progress.total} products · {percent}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Net variance recorded so far:{' '}
              <strong
                className={
                  progress.variance < 0 ? 'text-red-600' : 'text-emerald-600'
                }
              >
                {progress.variance > 0 ? '+' : ''}
                {progress.variance}
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canExport && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const result = await exportStockCountSessionCsv(
                        session.id
                      );
                      const url = URL.createObjectURL(
                        new Blob([result.csv], {
                          type: 'text/csv;charset=utf-8',
                        })
                      );
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = result.filename;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : 'Export failed'
                      );
                    }
                  })
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export results
              </Button>
            )}
            {editable && (
              <Button
                disabled={pending || progress.counted !== progress.total}
                onClick={() =>
                  run(
                    () => submitStockCountSession(session.id),
                    'Count submitted for independent review'
                  )
                }
              >
                <Send className="mr-2 h-4 w-4" />
                Submit count
              </Button>
            )}
            {canApprove && reviewable && (
              <>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => approveStockAdjustment(session.id),
                      'Count approved and inventory updated'
                    )
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve variances
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    const reason = window.prompt(
                      'Why is this count being rejected?'
                    );
                    if (reason)
                      run(
                        () => rejectStockAdjustment(session.id, reason),
                        'Count rejected'
                      );
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <form
          method="get"
          className="flex flex-col gap-2 border-b p-4 sm:flex-row"
        >
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search product, SKU or barcode"
            className="sm:max-w-md"
          />
          <select
            name="pageSize"
            defaultValue={String(pagination.pageSize)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {(search || pagination.pageSize !== 25) && (
            <Button asChild variant="ghost">
              <Link href={`/dashboard/inventory/counts/${session.id}`}>
                Clear
              </Link>
            </Button>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 text-right font-semibold">Expected</th>
                <th className="px-4 py-3 text-right font-semibold">Physical</th>
                <th className="px-4 py-3 text-right font-semibold">Variance</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Variance value
                </th>
                <th className="px-5 py-3 font-semibold">Note / action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(({ item, product }) => {
                const hideExpected = session.blindCount && editable;
                return (
                  <tr
                    key={item.id}
                    className={
                      item.countedAt
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/5'
                        : 'hover:bg-muted/20'
                    }
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-white">
                          <ProductImage
                            src={product.imageUrl}
                            alt={item.productName}
                            sizes="40px"
                          />
                        </span>
                        <div>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku || 'No SKU'} · {product.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {hideExpected ? 'Hidden' : item.quantityBefore}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {item.countedAt ? item.quantityAfter : 'Not counted'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}
                    >
                      {item.countedAt
                        ? `${item.variance > 0 ? '+' : ''}${item.variance}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.countedAt
                        ? formatCurrency(
                            item.variance * Number(product.buyingPrice),
                            currency
                          )
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {editable ? (
                        <form
                          action={(form) =>
                            run(
                              () =>
                                saveStockCountLine({
                                  sessionId: session.id,
                                  productId: item.productId,
                                  physicalQuantity: Number(
                                    form.get('quantity')
                                  ),
                                  notes: String(form.get('notes') || ''),
                                }),
                              `${item.productName} count saved`
                            )
                          }
                          className="flex items-center gap-2"
                        >
                          <Input
                            name="quantity"
                            type="number"
                            min="0"
                            max="10000000"
                            defaultValue={
                              item.countedAt ? item.quantityAfter : ''
                            }
                            placeholder="Qty"
                            className="w-24"
                            required
                          />
                          <Input
                            name="notes"
                            defaultValue={item.notes || ''}
                            maxLength={300}
                            placeholder="Optional note"
                            className="min-w-36"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                          >
                            <Save className="h-4 w-4" />
                            <span className="sr-only">
                              Save {item.productName}
                            </span>
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.notes ||
                            (item.countedAt ? 'Counted' : 'Not counted')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <nav className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {pagination.total
              ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`
              : 'No products'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              asChild={pagination.page > 1}
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
            >
              {pagination.page > 1 ? (
                <Link href={href(pagination.page - 1)}>
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
              Page {pagination.page} of {pagination.pageCount}
            </span>
            <Button
              asChild={pagination.page < pagination.pageCount}
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pageCount}
            >
              {pagination.page < pagination.pageCount ? (
                <Link href={href(pagination.page + 1)}>
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
    </>
  );
}
