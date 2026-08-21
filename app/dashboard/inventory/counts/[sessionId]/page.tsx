import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { getStockCountSessionDetails } from '@/app/actions/stock-adjustments';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { StockCountSessionManager } from '@/components/inventory/stock-count-session-manager';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Stock count session | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function StockCountSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const { sessionId } = await params;
  const query = (await searchParams) ?? {};
  const [{ organization }, details] = await Promise.all([
    requireWorkspaceModule('inventory'),
    getStockCountSessionDetails(sessionId, {
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 25),
      search: query.search || undefined,
    }),
  ]);
  if (!details) notFound();
  const {
    session,
    location,
    items,
    progress,
    pagination,
    canEdit,
    canApprove,
    canExport,
  } = details;
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
        icon={ClipboardCheck}
        eyebrow={`${session.adjustmentNo} · ${session.status.replaceAll('_', ' ')}`}
        title={session.countName || 'Stock count'}
        description={`${location?.name || 'Inventory location'} · Started ${formatDateTime(session.startedAt || session.createdAt)}${session.blindCount ? ' · Blind count' : ''}`}
      />
      <StockCountSessionManager
        session={{
          id: session.id,
          status: session.status,
          blindCount: session.blindCount,
        }}
        items={items}
        progress={progress}
        pagination={pagination}
        canEdit={canEdit}
        canApprove={canApprove}
        canExport={canExport}
        currency={organization.currency}
        search={query.search || ''}
      />
    </div>
  );
}
