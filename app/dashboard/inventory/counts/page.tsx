import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { getStockCountSessions } from '@/app/actions/stock-adjustments';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Stock count sessions | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function StockCountSessionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    branchId?: string;
  }>;
}) {
  const query = (await searchParams) ?? {};
  const data = await getStockCountSessions({
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 20),
    status: query.status || undefined,
    branchId: query.branchId || undefined,
  });
  const branchNames = new Map(
    data.branches.map((item) => [item.id, item.name])
  );
  const href = (page: number) => {
    const values = new URLSearchParams({
      page: String(page),
      pageSize: String(data.pagination.pageSize),
    });
    if (query.status) values.set('status', query.status);
    if (query.branchId) values.set('branchId', query.branchId);
    return `/dashboard/inventory/counts?${values.toString()}`;
  };
  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 pb-10">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inventory
      </Link>
      <DashboardPageHeading
        theme="adaptive"
        icon={ClipboardCheck}
        eyebrow="Inventory control"
        title="Stock count sessions"
        description="Count complete locations, review variances, and apply only approved corrections."
      />
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <form
          method="get"
          className="grid gap-2 border-b p-4 sm:grid-cols-[200px_200px_120px_auto]"
        >
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
            name="status"
            defaultValue={query.status || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {[
              'in_progress',
              'submitted',
              'under_review',
              'completed',
              'rejected',
            ].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select
            name="pageSize"
            defaultValue={String(data.pagination.pageSize)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="10">10 rows</option>
            <option value="20">20 rows</option>
            <option value="50">50 rows</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Apply
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/inventory/counts">Clear</Link>
            </Button>
          </div>
        </form>
        {data.sessions.length ? (
          <div className="divide-y">
            {data.sessions.map((session) => {
              const progress = data.progress[session.id] ?? {
                total: 0,
                counted: 0,
                variance: 0,
              };
              const percent = progress.total
                ? Math.round((progress.counted / progress.total) * 100)
                : 0;
              return (
                <Link
                  key={session.id}
                  href={`/dashboard/inventory/counts/${session.id}`}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_180px_220px_130px] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">
                        {session.countName || session.adjustmentNo}
                      </p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.68rem] font-bold capitalize">
                        {session.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.adjustmentNo} ·{' '}
                      {branchNames.get(session.branchId || '') ||
                        'Unknown location'}{' '}
                      · {formatDateTime(session.startedAt || session.createdAt)}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <strong>
                        {progress.counted}/{progress.total}
                      </strong>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.notes ||
                      (session.blindCount
                        ? 'Blind full-location count'
                        : 'Full-location count')}
                  </p>
                  <p
                    className={`text-right font-bold tabular-nums ${progress.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                  >
                    {progress.variance > 0 ? '+' : ''}
                    {progress.variance} variance
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No stock count sessions match these filters.
          </div>
        )}
        <nav className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {data.pagination.total
              ? `Showing ${(data.pagination.page - 1) * data.pagination.pageSize + 1}–${Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of ${data.pagination.total}`
              : '0 sessions'}
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
