import Link from 'next/link'
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { FileText, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch, customer, pharmacyProduct, pharmacySaleRecord, sale, saleItem, user } from '@/lib/db/schema'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { PermissionEnum } from '@/lib/types/permissions'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Prescription records | Pesaby' }
export const dynamic = 'force-dynamic'

export default async function PrescriptionRecordsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const authorization = await requirePermission(PermissionEnum.PRESCRIPTION_VIEW)
  const workspace = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!workspace || !isPharmacyBusiness(workspace.businessType, workspace.businessCategory)) redirect('/dashboard')
  const query = (await searchParams).q?.trim().slice(0, 80) ?? ''
  const rows = await db.select({
    id: pharmacySaleRecord.id,
    saleId: pharmacySaleRecord.saleId,
    prescriptionReference: pharmacySaleRecord.prescriptionReference,
    prescriberReference: pharmacySaleRecord.prescriberReference,
    approvedBy: pharmacySaleRecord.approvedBy,
    createdAt: pharmacySaleRecord.createdAt,
    receiptNo: sale.receiptNo,
    branchName: branch.name,
    customerName: customer.name,
    recordedBy: user.name,
  }).from(pharmacySaleRecord)
    .innerJoin(sale, and(eq(sale.id, pharmacySaleRecord.saleId), eq(sale.orgId, authorization.organizationId)))
    .innerJoin(branch, and(eq(branch.id, pharmacySaleRecord.branchId), eq(branch.organizationId, authorization.organizationId)))
    .innerJoin(user, eq(user.id, pharmacySaleRecord.createdBy))
    .leftJoin(customer, and(eq(customer.id, sale.customerId), eq(customer.orgId, authorization.organizationId)))
    .where(and(
      eq(pharmacySaleRecord.organizationId, authorization.organizationId),
      authorization.isOrganizationWide ? undefined : inArray(pharmacySaleRecord.branchId, authorization.branchIds.length ? authorization.branchIds : ['']),
      query ? or(
        ilike(sale.receiptNo, `%${query}%`),
        ilike(pharmacySaleRecord.prescriptionReference, `%${query}%`),
        ilike(pharmacySaleRecord.prescriberReference, `%${query}%`),
        ilike(customer.name, `%${query}%`),
      ) : undefined,
    )).orderBy(desc(pharmacySaleRecord.createdAt)).limit(200)

  const saleIds = rows.map((row) => row.saleId)
  const medicineRows = saleIds.length ? await db.select({
    saleId: saleItem.saleId,
    productName: saleItem.productName,
    quantity: saleItem.quantity,
    strength: pharmacyProduct.strength,
    dosageForm: pharmacyProduct.dosageForm,
    restrictedItem: pharmacyProduct.restrictedItem,
  }).from(saleItem).innerJoin(pharmacyProduct, and(
    eq(pharmacyProduct.productId, saleItem.productId),
    eq(pharmacyProduct.organizationId, authorization.organizationId),
  )).where(and(eq(saleItem.orgId, authorization.organizationId), inArray(saleItem.saleId, saleIds))) : []
  const medicinesBySale = new Map<string, typeof medicineRows>()
  for (const item of medicineRows) medicinesBySale.set(item.saleId, [...(medicinesBySale.get(item.saleId) ?? []), item])
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const cards = [
    { label: 'Records shown', value: rows.length, icon: FileText },
    { label: 'Recorded today', value: rows.filter((row) => row.createdAt >= todayStart).length, icon: Stethoscope },
    { label: 'Prescription references', value: rows.filter((row) => Boolean(row.prescriptionReference)).length, icon: UserRound },
    { label: 'Restricted approvals', value: rows.filter((row) => Boolean(row.approvedBy)).length, icon: ShieldCheck },
  ]

  return <div className="mx-auto max-w-[1480px] space-y-5 pb-10">
    <DashboardPageHeading icon={FileText} eyebrow="Pharmacy sales" title="Prescription records" description="Commercial dispensing references linked to receipts, staff and medicines. No diagnosis or clinical advice is stored." theme="adaptive" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-xl font-bold tabular-nums">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-xl border bg-card">
      <form className="flex flex-wrap items-end gap-2 border-b px-5 py-4"><label className="grid flex-1 gap-1 text-xs font-semibold">Find a record<input name="q" defaultValue={query} placeholder="Receipt, prescription, prescriber or customer" className="h-10 min-w-[240px] rounded-lg border bg-background px-3 text-sm" /></label><button className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background">Search</button>{query && <Link href="/dashboard/pharmacy/prescriptions" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold">Clear</Link>}</form>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-5 py-3">Receipt</th><th className="px-4 py-3">Prescription</th><th className="px-4 py-3">Medicines</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Recorded by</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id} className="align-top hover:bg-muted/20"><td className="px-5 py-3"><Link href={`/dashboard/sales/${row.saleId}`} className="font-mono text-xs font-semibold hover:underline">{row.receiptNo}</Link>{row.approvedBy && <p className="mt-1 text-[10px] font-bold text-emerald-700">Restricted approval recorded</p>}</td><td className="px-4 py-3"><p className="font-medium">{row.prescriptionReference || 'Restricted-item record'}</p><p className="mt-1 text-xs text-muted-foreground">{row.prescriberReference || 'No prescriber reference'}</p></td><td className="px-4 py-3"><div className="space-y-1">{(medicinesBySale.get(row.saleId) ?? []).map((item, index) => <p key={`${item.productName}-${index}`} className="text-xs"><span className="font-semibold">{item.productName}</span> × {item.quantity}<span className="text-muted-foreground"> {[item.strength, item.dosageForm].filter(Boolean).join(' · ')}</span>{item.restrictedItem && <span className="ml-1 font-bold text-amber-700">Restricted</span>}</p>)}</div></td><td className="px-4 py-3">{row.customerName || 'Walk-in'}</td><td className="px-4 py-3">{row.branchName}</td><td className="px-4 py-3">{row.recordedBy}</td><td className="px-5 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-muted-foreground">{query ? 'No prescription records match this search.' : 'No prescription or restricted-medicine sales have been recorded yet.'}</td></tr>}</tbody></table></div>
    </section>
  </div>
}
