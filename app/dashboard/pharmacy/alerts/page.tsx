import Link from 'next/link'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { AlertTriangle, ArrowRight, BellRing } from 'lucide-react'
import { getMedicineRecalls, getPharmacyBatchInventory } from '@/app/actions/pharmacy'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { etimsSubmission, mpesaPaymentRequest, offlineSaleSync, pharmacyProduct, product } from '@/lib/db/schema'
import { PermissionEnum } from '@/lib/types/permissions'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'

export const metadata = { title: 'Pharmacy alerts | Pesaby' }
export const dynamic = 'force-dynamic'

export default async function PharmacyAlertsPage() {
  const auth = await requirePermission(PermissionEnum.BATCH_TRACKING_VIEW)
  const [inventory, recallData, lowStock, integrations] = await Promise.all([
    getPharmacyBatchInventory(), getMedicineRecalls(),
    db.select({ id: product.id, name: product.name, stock: product.stock, minStock: product.minStock }).from(product).innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, product.id), eq(pharmacyProduct.organizationId, auth.organizationId))).where(and(eq(product.orgId, auth.organizationId), eq(product.isActive, true), sql`${product.stock} <= ${product.minStock}`)).limit(100),
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(etimsSubmission).where(and(eq(etimsSubmission.organizationId, auth.organizationId), inArray(etimsSubmission.status, ['FAILED', 'PENDING', 'RETRYING']))),
      db.select({ count: sql<number>`count(*)` }).from(offlineSaleSync).where(and(eq(offlineSaleSync.organizationId, auth.organizationId), inArray(offlineSaleSync.status, ['FAILED', 'CONFLICT', 'REVIEW_REQUIRED']))),
      db.select({ count: sql<number>`count(*)` }).from(mpesaPaymentRequest).where(and(eq(mpesaPaymentRequest.organizationId, auth.organizationId), inArray(mpesaPaymentRequest.status, ['PENDING', 'FAILED', 'TIMEOUT']))),
    ]),
  ])
  const alerts = [
    ...inventory.batches.filter((item) => item.expiry.status === 'expired').map((item) => ({ severity: 'critical', title: `Expired: ${item.productName}`, detail: `Batch ${item.lotNumber} has ${item.quantity} units at ${item.branchName}.`, href: '/dashboard/inventory/batches', action: 'Quarantine or dispose' })),
    ...inventory.batches.filter((item) => !item.expiresAt).map((item) => ({ severity: 'critical', title: `Missing expiry: ${item.productName}`, detail: `Batch ${item.lotNumber} cannot be sold until reviewed.`, href: '/dashboard/inventory/batches', action: 'Review batch' })),
    ...recallData.recalls.filter((item) => item.status === 'active').map((item) => ({ severity: 'critical', title: `Active recall: ${item.productName}`, detail: `${item.reference} · batch ${item.lotNumber} · ${item.affectedSales} affected sales.`, href: '/dashboard/pharmacy/recalls', action: 'Open recall' })),
    ...inventory.returnedStock.map((item) => ({ severity: 'warning', title: `Returned medicine awaiting decision`, detail: `${item.productName} · ${item.quantity} units · ${item.returnNo}.`, href: '/dashboard/inventory/batches', action: 'Review return' })),
    ...inventory.supplierReturns.filter((item) => ['pending', 'accepted'].includes(item.status || '')).map((item) => ({ severity: 'warning', title: `Supplier return awaiting settlement`, detail: `${item.productName} · ${item.reference} · ${item.status}.`, href: '/dashboard/inventory/batches', action: 'Record response' })),
    ...lowStock.map((item) => ({ severity: Number(item.stock) <= 0 ? 'critical' : 'warning', title: `${Number(item.stock) <= 0 ? 'Out of stock' : 'Low stock'}: ${item.name}`, detail: `${item.stock} units available; reorder level ${item.minStock}.`, href: '/dashboard/stock-intake', action: 'Record stock intake' })),
    ...(Number(integrations[0][0]?.count || 0) ? [{ severity: 'warning', title: 'eTIMS submissions need attention', detail: `${Number(integrations[0][0]?.count)} submissions are pending, retrying or failed.`, href: '/dashboard/etims', action: 'Reconcile eTIMS' }] : []),
    ...(Number(integrations[1][0]?.count || 0) ? [{ severity: 'critical', title: 'Offline sales need attention', detail: `${Number(integrations[1][0]?.count)} offline sales failed or require review.`, href: '/dashboard/operations', action: 'Review synchronization' }] : []),
    ...(Number(integrations[2][0]?.count || 0) ? [{ severity: 'warning', title: 'M-Pesa requests need attention', detail: `${Number(integrations[2][0]?.count)} payment requests are pending or failed.`, href: '/dashboard/operations', action: 'Review payments' }] : []),
  ]
  return <div className="mx-auto max-w-[1200px] space-y-5 pb-10"><DashboardPageHeading icon={BellRing} eyebrow="Pharmacy operations" title="Action centre" description="Live safety, stock, payment and fiscal issues. An alert disappears only when its source record is resolved." theme="adaptive" />
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Critical" value={alerts.filter((item) => item.severity === 'critical').length} /><Metric label="Needs attention" value={alerts.filter((item) => item.severity === 'warning').length} /><Metric label="Total open" value={alerts.length} /></div>
    <section className="overflow-hidden rounded-xl border bg-card"><div className="divide-y">{alerts.length ? alerts.map((item, index) => <article key={`${item.title}-${index}`} className="flex flex-wrap items-center gap-4 p-4"><AlertTriangle className={item.severity === 'critical' ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-amber-600'} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><Link href={item.href} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted">{item.action}<ArrowRight className="h-3.5 w-3.5" /></Link></article>) : <div className="p-12 text-center"><p className="text-sm font-semibold">No open pharmacy alerts</p><p className="mt-1 text-xs text-muted-foreground">Stock, integrations and safety records are currently clear.</p></div>}</div></section>
  </div>
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{value}</p></div> }
