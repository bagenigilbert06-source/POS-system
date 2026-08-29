import type { Metadata } from 'next'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { FileText } from 'lucide-react'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { InvoicesTable } from '@/components/invoices/invoices-table'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { hasPermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch, businessSettings, customer, invoice } from '@/lib/db/schema'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const context = await requireDashboardPermission(PermissionEnum.INVOICE_VIEW)
  const branchScope = context.isOrganizationWide ? undefined : inArray(invoice.branchId, context.branchIds)
  const availableBranchScope = context.isOrganizationWide ? undefined : inArray(branch.id, context.branchIds)
  const [invoices, customers, branches, settings] = await Promise.all([
    db.select().from(invoice).where(and(eq(invoice.orgId, context.organizationId), branchScope)).orderBy(desc(invoice.createdAt)),
    db.select({ id: customer.id, name: customer.name }).from(customer).where(eq(customer.orgId, context.organizationId)).orderBy(asc(customer.name)),
    db.select({ id: branch.id, name: branch.name }).from(branch).where(and(eq(branch.organizationId, context.organizationId), availableBranchScope)).orderBy(desc(branch.isMain), asc(branch.name)),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, context.organizationId)).limit(1).then((rows) => rows[0]),
  ])
  const canCreate = hasPermission(context, PermissionEnum.INVOICE_CREATE)

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <DashboardPageHeading icon={FileText} title="Invoices" description="Issue professional invoices and track every payment and outstanding balance." />
      {canCreate && <CreateInvoiceDialog customers={customers} branches={branches} canIssue={hasPermission(context, PermissionEnum.INVOICE_ISSUE)} taxPolicy={{ enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }} />}
    </div>
    <section className="overflow-hidden rounded-lg border bg-card">
      <InvoicesTable invoices={invoices} permissions={{ canIssue: hasPermission(context, PermissionEnum.INVOICE_ISSUE), canRecordPayment: hasPermission(context, PermissionEnum.INVOICE_RECORD_PAYMENT), canCancel: hasPermission(context, PermissionEnum.INVOICE_CANCEL), canCreditNote: hasPermission(context, PermissionEnum.INVOICE_CREDIT_NOTE) }} />
    </section>
  </div>
}
