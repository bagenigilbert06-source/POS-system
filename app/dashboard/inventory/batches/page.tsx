import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  PackageCheck,
} from 'lucide-react';
import {
  getPharmacyBatchInventory,
  updatePharmacyExpirySettings,
} from '@/app/actions/pharmacy';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import {
  ReturnDispositionActions,
  SupplierReturnSettlement,
} from '@/components/pharmacy/return-disposition-actions';
import { BatchStatusActions } from '@/components/pharmacy/batch-status-actions';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata = { title: 'Medicine batches | Pesaby' };
export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = {
  normal: 'Normal',
  expiring_soon: 'Expiring soon',
  near_expiry: 'Near expiry',
  expired: 'Expired',
};

export default async function PharmacyBatchesPage() {
  const data = await getPharmacyBatchInventory();
  const cards = [
    { label: 'Tracked batches', value: data.summary.totalBatches, icon: Boxes },
    {
      label: 'Available units',
      value: data.summary.availableUnits,
      icon: PackageCheck,
    },
    {
      label: 'Expiring soon',
      value: data.summary.expiringSoon,
      icon: CalendarClock,
    },
    {
      label: 'Expired batches',
      value: data.summary.expired,
      icon: AlertTriangle,
    },
  ];
  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading
        icon={Boxes}
        eyebrow="Pharmacy inventory"
        title="Batches and expiry"
        description={`FEFO-ready medicine stock with ${data.warningDays.join(', ')} day warning thresholds.`}
        theme="adaptive"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      {data.canManageBatches && (
        <section className="rounded-xl border bg-card px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">Expiry policy</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                FEFO, prescription checks, and restricted-item approval remain
                enforced.
              </p>
            </div>
            <form
              action={updatePharmacyExpirySettings}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs font-medium">
                Warning days
                <input
                  name="expiryWarningDays"
                  defaultValue={data.warningDays.join(', ')}
                  aria-label="Expiry warning days"
                  className="h-9 w-44 rounded-md border bg-background px-3 text-sm"
                />
              </label>
              <button className="h-9 rounded-md bg-foreground px-3 text-xs font-semibold text-background">
                Save policy
              </button>
            </form>
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Batch inventory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Expired batches are excluded from normal FEFO checkout
              automatically.
            </p>
          </div>
          <Link
            href="/dashboard/stock-intake"
            className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            Receive medicine stock
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Medicine</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Cost value</th>
                {data.canManageBatches && (
                  <th className="px-5 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.batches.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/products/${item.productId}`}
                      className="font-semibold hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[item.genericName, item.strength, item.dosageForm]
                        .filter(Boolean)
                        .join(' · ') ||
                        item.brand ||
                        'Medicine'}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.lotNumber}
                  </td>
                  <td className="px-4 py-3">{item.branchName}</td>
                  <td className="px-4 py-3 tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3">
                    {item.expiresAt
                      ? formatDate(item.expiresAt)
                      : 'Not recorded'}
                    {item.expiry.daysRemaining !== null && (
                      <p className="text-xs text-muted-foreground">
                        {item.expiry.daysRemaining < 0
                          ? `${Math.abs(item.expiry.daysRemaining)} days overdue`
                          : `${item.expiry.daysRemaining} days left`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.expiry.status === 'expired' ? 'border-red-300 text-red-700' : item.expiry.status === 'near_expiry' ? 'border-amber-300 text-amber-800' : ''}`}
                    >
                      {statusLabel[item.expiry.status]}
                    </span>
                    {item.lotStatus !== 'available' && (
                      <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                        {item.lotStatus}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.supplierName || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(item.quantity * item.unitCost)}
                  </td>
                  {data.canManageBatches && (
                    <td className="px-5 py-3">
                      <BatchStatusActions lotId={item.id} status={item.lotStatus} expired={item.expiry.status === 'expired'} quantity={item.quantity} />
                    </td>
                  )}
                </tr>
              ))}
              {data.batches.length === 0 && (
                <tr>
                  <td
                    colSpan={data.canManageBatches ? 9 : 8}
                    className="px-5 py-14 text-center text-sm text-muted-foreground"
                  >
                    No medicine batches yet. Complete a Stock Intake with a
                    batch number and expiry date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-bold">Returned medicine quarantine</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Returned items remain unavailable until an authorized stock decision
            is recorded.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Medicine</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3">Original batch</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Received</th>
                {data.canManageBatches && (
                  <th className="px-5 py-3 text-right">Decision</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.returnedStock.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/products/${item.productId}`}
                      className="font-semibold hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.genericName || 'Medicine'}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.returnNo}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.lotNumber || 'Trace unavailable'}
                  </td>
                  <td className="px-4 py-3">{item.branchName}</td>
                  <td className="px-4 py-3 tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                  {data.canManageBatches && (
                    <td className="px-5 py-3">
                      <ReturnDispositionActions
                        dispositionId={item.id}
                        canRelease={Boolean(item.originalLotId)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {data.returnedStock.length === 0 && (
                <tr>
                  <td
                    colSpan={data.canManageBatches ? 7 : 6}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No returned medicine is awaiting review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-bold">Supplier returns</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Track RMA references, supplier acceptance and credit-note
            settlement.
          </p>
        </div>
        <div className="divide-y">
          {data.supplierReturns.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-3 p-4 text-xs lg:grid-cols-[1fr_auto_auto_2fr]"
            >
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-muted-foreground">
                  {item.branchName} · {item.quantity} units
                </p>
              </div>
              <span className="font-mono">{item.reference}</span>
              <span className="rounded-full border px-2 py-1 font-semibold capitalize">
                {item.status}
              </span>
              {data.canManageBatches &&
              ['pending', 'accepted'].includes(item.status || '') ? (
                <SupplierReturnSettlement dispositionId={item.id} />
              ) : (
                <p className="text-right text-muted-foreground">
                  {item.creditNote ? `Credit: ${item.creditNote}` : item.notes}
                </p>
              )}
            </div>
          ))}
          {data.supplierReturns.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No medicines are currently with a supplier.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
