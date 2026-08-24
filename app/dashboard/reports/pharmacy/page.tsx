import { and, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { AlertTriangle, FileBarChart, ShieldCheck } from 'lucide-react'
import { db } from '@/lib/db'
import { branch, inventoryLot, pharmacyMedicineRecall, pharmacyProduct, pharmacyReturnDisposition, pharmacySaleRecord, product, restrictedItemAudit, sale, supplier, user } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { redirect } from 'next/navigation'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Pharmacy operations report | Pesaby' }
export const dynamic = 'force-dynamic'

export default async function PharmacyOperationsReport() {
  const auth = await requirePermission(PermissionEnum.REPORT_VIEW)
  const workspace = await WorkspaceService.getWorkspaceConfig(auth.organizationId, auth.userId)
  if (!workspace || !isPharmacyBusiness(workspace.businessType, workspace.businessCategory)) redirect('/dashboard/reports')
  const branchScope = auth.isOrganizationWide ? undefined : inArray(inventoryLot.branchId, auth.branchIds.length ? auth.branchIds : [''])
  const now = new Date(); const in90 = new Date(now.getTime() + 90 * 86400000)
  const [lots, controlled, returns, prescriptionCounts, recallCounts] = await Promise.all([
    db.select({ id: inventoryLot.id, productName: product.name, lotNumber: inventoryLot.lotNumber, branchName: branch.name, quantity: inventoryLot.quantity, unitCost: inventoryLot.unitCost, expiresAt: inventoryLot.expiresAt, status: inventoryLot.status, supplierName: supplier.name }).from(inventoryLot).innerJoin(product, and(eq(product.id, inventoryLot.productId), eq(product.orgId, auth.organizationId))).innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, product.id), eq(pharmacyProduct.organizationId, auth.organizationId))).innerJoin(branch, and(eq(branch.id, inventoryLot.branchId), eq(branch.organizationId, auth.organizationId))).leftJoin(supplier, and(eq(supplier.id, inventoryLot.supplierId), eq(supplier.orgId, auth.organizationId))).where(and(eq(inventoryLot.orgId, auth.organizationId), branchScope, sql`(${inventoryLot.expiresAt} <= ${in90} or ${inventoryLot.expiresAt} is null or ${inventoryLot.status} <> 'available')`)).orderBy(inventoryLot.expiresAt),
    db.select({ id: restrictedItemAudit.id, createdAt: restrictedItemAudit.createdAt, productName: product.name, quantity: restrictedItemAudit.quantity, branchName: branch.name, receiptNo: sale.receiptNo, cashierName: user.name, approvedBy: restrictedItemAudit.approvedBy, reason: restrictedItemAudit.reason }).from(restrictedItemAudit).innerJoin(product, and(eq(product.id, restrictedItemAudit.productId), eq(product.orgId, auth.organizationId))).innerJoin(branch, and(eq(branch.id, restrictedItemAudit.branchId), eq(branch.organizationId, auth.organizationId))).innerJoin(sale, and(eq(sale.id, restrictedItemAudit.saleId), eq(sale.orgId, auth.organizationId))).leftJoin(user, eq(user.id, restrictedItemAudit.cashierId)).where(and(eq(restrictedItemAudit.organizationId, auth.organizationId), auth.isOrganizationWide ? undefined : inArray(restrictedItemAudit.branchId, auth.branchIds.length ? auth.branchIds : ['']))).orderBy(desc(restrictedItemAudit.createdAt)).limit(100),
    db.select({ status: pharmacyReturnDisposition.status, count: sql<number>`count(*)`, quantity: sql<string>`coalesce(sum(${pharmacyReturnDisposition.quantity}),0)` }).from(pharmacyReturnDisposition).where(eq(pharmacyReturnDisposition.organizationId, auth.organizationId)).groupBy(pharmacyReturnDisposition.status),
    db.select({ status: pharmacySaleRecord.status, count: sql<number>`count(*)` }).from(pharmacySaleRecord).where(eq(pharmacySaleRecord.organizationId, auth.organizationId)).groupBy(pharmacySaleRecord.status),
    db.select({ status: pharmacyMedicineRecall.status, count: sql<number>`count(*)` }).from(pharmacyMedicineRecall).where(eq(pharmacyMedicineRecall.organizationId, auth.organizationId)).groupBy(pharmacyMedicineRecall.status),
  ])
  const value = (rows: typeof lots) => rows.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitCost), 0)
  const expired = lots.filter((row) => row.expiresAt && row.expiresAt <= now)
  const missingExpiry = lots.filter((row) => !row.expiresAt)
  const quarantined = lots.filter((row) => row.status !== 'available')
  return <div className="mx-auto max-w-[1480px] space-y-5 pb-10">
    <DashboardPageHeading icon={FileBarChart} eyebrow="Pharmacy operations" title="Safety and dispensing report" description="Live batch risk, controlled-dispensing records, returns and recalls from real pharmacy data." theme="adaptive" />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Expiring within 90 days', lots.filter((row) => row.expiresAt && row.expiresAt > now).length, formatCurrency(value(lots.filter((row) => row.expiresAt && row.expiresAt > now)), 'KES')],
      ['Expired batches', expired.length, formatCurrency(value(expired), 'KES')], ['Quarantined/recalled', quarantined.length, formatCurrency(value(quarantined), 'KES')], ['Missing expiry', missingExpiry.length, 'Must remain unavailable'],
    ].map(([label, metric, detail]) => <article key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{metric}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>)}</section>
    <section className="grid gap-3 lg:grid-cols-3"><Summary title="Prescription workflow" rows={prescriptionCounts.map((row) => [row.status, Number(row.count)])} /><Summary title="Medicine returns" rows={returns.map((row) => [`${row.status} (${Number(row.quantity)} units)`, Number(row.count)])} /><Summary title="Recall status" rows={recallCounts.map((row) => [row.status, Number(row.count)])} /></section>
    <section className="rounded-xl border bg-card"><div className="border-b p-4"><h2 className="text-sm font-semibold">Batch risk register</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b bg-muted/30"><tr>{['Medicine','Batch','Branch','Quantity','Expiry','Status','Value'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{lots.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{row.productName}</td><td className="px-4 py-3">{row.lotNumber}</td><td className="px-4 py-3">{row.branchName}</td><td className="px-4 py-3">{Number(row.quantity)}</td><td className="px-4 py-3">{row.expiresAt?.toLocaleDateString('en-KE') ?? 'Missing'}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{formatCurrency(Number(row.quantity) * Number(row.unitCost), 'KES')}</td></tr>)}</tbody></table></div></section>
    <section className="rounded-xl border bg-card"><div className="border-b p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Controlled-medicine register</h2><p className="text-xs text-muted-foreground">Latest 100 dispensing audit entries.</p></div><div className="divide-y">{controlled.length ? controlled.map((row) => <div key={row.id} className="grid gap-1 p-4 text-xs md:grid-cols-6"><span className="font-semibold">{row.productName}</span><span>{Number(row.quantity)} units</span><span>{row.receiptNo}</span><span>{row.branchName}</span><span>{row.cashierName ?? 'Former staff'}</span><span>{formatDateTime(row.createdAt)}</span><p className="md:col-span-6 text-muted-foreground">{row.reason || 'No reason recorded'}</p></div>) : <p className="p-6 text-sm text-muted-foreground">No controlled-medicine records.</p>}</div></section>
  </div>
}

function Summary({ title, rows }: { title: string; rows: Array<[string, number]> }) { return <article className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">{title}</h2><dl className="mt-3 space-y-2">{rows.length ? rows.map(([label, value]) => <div key={label} className="flex justify-between text-xs"><dt className="capitalize text-muted-foreground">{label.replaceAll('_', ' ')}</dt><dd className="font-semibold">{value}</dd></div>) : <p className="text-xs text-muted-foreground">No records yet.</p>}</dl></article> }
