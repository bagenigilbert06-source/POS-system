import type { Metadata } from 'next'
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { HandCoins } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ReceivablesTable } from '@/components/receivables/receivables-table'
import { CreditLimitDialog } from '@/components/receivables/credit-limit-dialog'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { hasPermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch, creditPayment, creditSale, customer, customerCreditLimit, invoice, organization, sale } from '@/lib/db/schema'
import { organizationDateBoundaries, receivableAge } from '@/lib/finance/dates'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Accounts Receivable' }

type Params = { page?: string; q?: string; status?: string; age?: string; branch?: string }

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const context = await requireDashboardPermission(PermissionEnum.RECEIVABLE_VIEW)
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25
  const [org] = await db.select({ timezone: organization.timezone }).from(organization).where(eq(organization.id, context.organizationId)).limit(1)
  const timezone = org?.timezone || 'UTC'
  const boundaries = organizationDateBoundaries(timezone)
  const authorizedBranches = await db.select({ id: branch.id, name: branch.name }).from(branch).where(and(eq(branch.organizationId, context.organizationId), context.isOrganizationWide ? undefined : inArray(branch.id, context.branchIds))).orderBy(asc(branch.name))
  const creditCustomers = await db.select({ id: customer.id, name: customer.name, creditLimit: customerCreditLimit.creditLimit, currentBalance: customerCreditLimit.currentBalance, status: customerCreditLimit.status }).from(customer).leftJoin(customerCreditLimit, and(eq(customerCreditLimit.customerId, customer.id), eq(customerCreditLimit.orgId, context.organizationId))).where(eq(customer.orgId, context.organizationId)).orderBy(asc(customer.name))
  const selectedBranch = params.branch && authorizedBranches.some((item) => item.id === params.branch) ? params.branch : undefined
  const branchScope = selectedBranch ? eq(sale.branchId, selectedBranch) : context.isOrganizationWide ? undefined : inArray(sale.branchId, context.branchIds)
  const outstanding = sql`${creditSale.amount} > ${creditSale.amountPaid} + ${creditSale.creditedAmount}`
  const ageScope = params.age === 'current' ? or(isNull(creditSale.dueDate), gte(creditSale.dueDate, boundaries.today))
    : params.age === '1-30' ? and(lt(creditSale.dueDate, boundaries.today), gte(creditSale.dueDate, boundaries.day(-30)))
      : params.age === '31-60' ? and(lt(creditSale.dueDate, boundaries.day(-30)), gte(creditSale.dueDate, boundaries.day(-60)))
        : params.age === '61-90' ? and(lt(creditSale.dueDate, boundaries.day(-60)), gte(creditSale.dueDate, boundaries.day(-90)))
          : params.age === '90+' ? lt(creditSale.dueDate, boundaries.day(-90)) : undefined
  const statusScope = params.status === 'overdue' ? lt(creditSale.dueDate, boundaries.today) : params.status === 'due_soon' ? and(gte(creditSale.dueDate, boundaries.today), lt(creditSale.dueDate, boundaries.day(8))) : undefined
  const queryScope = params.q ? or(ilike(customer.name, `%${params.q}%`), ilike(sale.receiptNo, `%${params.q}%`), ilike(invoice.invoiceNo, `%${params.q}%`)) : undefined
  const scope = and(eq(creditSale.orgId, context.organizationId), outstanding, branchScope, ageScope, statusScope, queryScope)

  const [rows, countRows, summaryRows, collectedRows] = await Promise.all([
    db.select({ id: creditSale.id, customerId: creditSale.customerId, customerName: customer.name, customerPhone: customer.phone, saleId: creditSale.saleId, saleReference: sale.receiptNo, branchId: sale.branchId, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount: creditSale.amount, amountPaid: creditSale.amountPaid, creditedAmount: creditSale.creditedAmount, dueDate: creditSale.dueDate, createdAt: creditSale.createdAt, storedStatus: creditSale.status }).from(creditSale).innerJoin(customer, eq(customer.id, creditSale.customerId)).innerJoin(sale, eq(sale.id, creditSale.saleId)).leftJoin(invoice, eq(invoice.creditSaleId, creditSale.id)).where(scope).orderBy(asc(creditSale.dueDate), desc(creditSale.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(creditSale).innerJoin(customer, eq(customer.id, creditSale.customerId)).innerJoin(sale, eq(sale.id, creditSale.saleId)).leftJoin(invoice, eq(invoice.creditSaleId, creditSale.id)).where(scope),
    db.select({ total: sql<string>`coalesce(sum(${creditSale.amount} - ${creditSale.amountPaid} - ${creditSale.creditedAmount}), 0)`, overdue: sql<string>`coalesce(sum(case when ${creditSale.dueDate} < ${boundaries.today} then ${creditSale.amount} - ${creditSale.amountPaid} - ${creditSale.creditedAmount} else 0 end), 0)`, dueSoon: sql<string>`coalesce(sum(case when ${creditSale.dueDate} >= ${boundaries.today} and ${creditSale.dueDate} < ${boundaries.day(8)} then ${creditSale.amount} - ${creditSale.amountPaid} - ${creditSale.creditedAmount} else 0 end), 0)` }).from(creditSale).innerJoin(sale, eq(sale.id, creditSale.saleId)).where(and(eq(creditSale.orgId, context.organizationId), outstanding, branchScope)),
    db.select({ total: sql<string>`coalesce(sum(${creditPayment.amount}), 0)` }).from(creditPayment).innerJoin(creditSale, eq(creditSale.id, creditPayment.creditSaleId)).innerJoin(sale, eq(sale.id, creditSale.saleId)).where(and(eq(creditPayment.orgId, context.organizationId), gte(creditPayment.createdAt, boundaries.monthStart), lt(creditPayment.createdAt, boundaries.nextMonthStart), branchScope)),
  ])
  const totalRows = Number(countRows[0]?.value ?? 0)
  const receivables = rows.map((row) => ({ ...row, balance: (Number(row.amount) - Number(row.amountPaid) - Number(row.creditedAmount)).toFixed(2), age: receivableAge(row.dueDate, timezone) }))

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><DashboardPageHeading icon={HandCoins} title="Accounts Receivable" description="See exactly who owes the business, what is overdue, and every collection made." />{hasPermission(context, PermissionEnum.RECEIVABLE_MANAGE) && <CreditLimitDialog customers={creditCustomers} />}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Total outstanding', summaryRows[0]?.total ?? '0'], ['Overdue', summaryRows[0]?.overdue ?? '0'], ['Due in 7 days', summaryRows[0]?.dueSoon ?? '0'], ['Collected this month', collectedRows[0]?.total ?? '0'],
    ].map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">KES {Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p></div>)}</div>
    <ReceivablesTable rows={receivables} branches={authorizedBranches} filters={{ q: params.q ?? '', status: params.status ?? 'all', age: params.age ?? 'all', branch: selectedBranch ?? 'all' }} pagination={{ page, pages: Math.max(1, Math.ceil(totalRows / pageSize)), total: totalRows }} canManage={hasPermission(context, PermissionEnum.RECEIVABLE_MANAGE)} />
  </div>
}
