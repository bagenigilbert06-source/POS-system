import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { ArrowLeft, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { db } from '@/lib/db'
import { creditPayment, creditSale, customer, invoice, sale, salesReturn } from '@/lib/db/schema'
import { PermissionEnum } from '@/lib/types/permissions'

type Event = { id: string; at: Date; type: string; reference: string; debit: number; credit: number; note: string }
const currency = (value: number) => `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function CustomerReceivableStatementPage({ params }: { params: Promise<{ customerId: string }> }) {
  const context = await requireDashboardPermission(PermissionEnum.RECEIVABLE_VIEW)
  const { customerId } = await params
  const [customerRecord] = await db.select().from(customer).where(and(eq(customer.id, customerId), eq(customer.orgId, context.organizationId))).limit(1)
  if (!customerRecord) notFound()
  const branchScope = context.isOrganizationWide ? undefined : inArray(sale.branchId, context.branchIds)
  const [credits, payments, refunds] = await Promise.all([
    db.select({ id: creditSale.id, at: creditSale.createdAt, amount: creditSale.amount, paid: creditSale.amountPaid, credited: creditSale.creditedAmount, receiptNo: sale.receiptNo, invoiceNo: invoice.invoiceNo }).from(creditSale).innerJoin(sale, eq(sale.id, creditSale.saleId)).leftJoin(invoice, eq(invoice.creditSaleId, creditSale.id)).where(and(eq(creditSale.orgId, context.organizationId), eq(creditSale.customerId, customerId), branchScope)).orderBy(asc(creditSale.createdAt)),
    db.select({ id: creditPayment.id, at: creditPayment.createdAt, amount: creditPayment.amount, method: creditPayment.method, reference: creditPayment.reference, receiptNo: sale.receiptNo }).from(creditPayment).innerJoin(creditSale, eq(creditSale.id, creditPayment.creditSaleId)).innerJoin(sale, eq(sale.id, creditSale.saleId)).where(and(eq(creditPayment.orgId, context.organizationId), eq(creditSale.customerId, customerId), branchScope)).orderBy(asc(creditPayment.createdAt)),
    db.select({ id: salesReturn.id, at: salesReturn.createdAt, amount: salesReturn.amount, returnNo: salesReturn.returnNo, reason: salesReturn.reason, receiptNo: sale.receiptNo }).from(salesReturn).innerJoin(sale, eq(sale.id, salesReturn.saleId)).innerJoin(creditSale, eq(creditSale.saleId, sale.id)).where(and(eq(salesReturn.orgId, context.organizationId), eq(salesReturn.status, 'completed'), eq(salesReturn.refundMethod, 'credit'), eq(creditSale.customerId, customerId), branchScope)).orderBy(asc(salesReturn.createdAt)),
  ])
  const events: Event[] = [
    ...credits.map((item) => ({ id: `sale:${item.id}`, at: item.at, type: 'Credit sale', reference: item.invoiceNo || item.receiptNo, debit: Number(item.amount), credit: 0, note: item.invoiceNo ? `Receipt ${item.receiptNo}` : 'Customer credit purchase' })),
    ...payments.map((item) => ({ id: `payment:${item.id}`, at: item.at, type: 'Payment', reference: item.reference || item.receiptNo, debit: 0, credit: Number(item.amount), note: item.method.replaceAll('_', ' ') })),
    ...refunds.map((item) => ({ id: `refund:${item.id}`, at: item.at, type: 'Credit note / return', reference: item.returnNo, debit: 0, credit: Number(item.amount), note: `${item.receiptNo} · ${item.reason}` })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
  let running = 0
  const statement = events.map((event) => { running = Math.max(0, Math.round((running + event.debit - event.credit) * 100) / 100); return { ...event, running } })
  const authoritativeBalance = credits.reduce((sum, item) => sum + Number(item.amount) - Number(item.paid) - Number(item.credited), 0)

  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <Button asChild variant="ghost" size="sm"><Link href="/dashboard/receivables"><ArrowLeft className="mr-2 h-4 w-4" />Accounts receivable</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><UserRound className="h-5 w-5" /></div><div><h1 className="text-xl font-semibold">{customerRecord.name}</h1><p className="mt-1 text-sm text-muted-foreground">{[customerRecord.phone, customerRecord.email].filter(Boolean).join(' · ') || 'Customer financial statement'}</p></div></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding balance</p><p className="mt-1 text-2xl font-semibold">{currency(authoritativeBalance)}</p></div></div>
    <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b p-4"><h2 className="font-semibold">Customer statement</h2><p className="text-xs text-muted-foreground">Sales increase the balance; payments and approved credit returns reduce it.</p></div>{statement.length === 0 ? <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">No customer credit activity.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Reference</th><th className="px-4 py-3 text-left">Details</th><th className="px-4 py-3 text-right">Charge</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody>{statement.map((event) => <tr key={event.id} className="border-t"><td className="px-4 py-3">{event.at.toLocaleDateString()}</td><td className="px-4 py-3 font-medium">{event.type}</td><td className="px-4 py-3 font-mono text-xs">{event.reference}</td><td className="px-4 py-3 text-muted-foreground">{event.note}</td><td className="px-4 py-3 text-right">{event.debit ? currency(event.debit) : '—'}</td><td className="px-4 py-3 text-right text-emerald-700">{event.credit ? currency(event.credit) : '—'}</td><td className="px-4 py-3 text-right font-semibold">{currency(event.running)}</td></tr>)}</tbody></table></div>}<div className="flex justify-end border-t bg-muted/20 p-4"><p className="text-sm"><span className="text-muted-foreground">Closing balance: </span><strong>{currency(authoritativeBalance)}</strong></p></div></section>
  </div>
}
