import { and, desc, eq, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react'
import { db } from '@/lib/db'
import { mpesaIncomingPayment } from '@/lib/db/schema'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MpesaReconciliationPage() {
  const authorization = await requireAnyPermission([PermissionEnum.SHIFT_MANAGE, PermissionEnum.AUDIT_LOG_VIEW])
  if (!authorization.isOrganizationWide && authorization.branchIds.length === 0) redirect('/restricted')
  const rows = await db.select().from(mpesaIncomingPayment).where(and(
    eq(mpesaIncomingPayment.organizationId, authorization.organizationId),
    authorization.isOrganizationWide ? undefined : inArray(mpesaIncomingPayment.branchId, authorization.branchIds),
  )).orderBy(desc(mpesaIncomingPayment.createdAt)).limit(200)

  return <div className="mx-auto max-w-5xl space-y-5">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Payments</p>
      <h1 className="mt-1 text-2xl font-bold">M-Pesa reconciliation</h1>
      <p className="mt-1 text-sm text-muted-foreground">Confirmed Daraja receipts. Ambiguous Till payments are kept here instead of being guessed.</p>
    </div>
    <section className="overflow-hidden rounded-xl border bg-card">
      {rows.length ? <div className="divide-y">{rows.map((row) => {
        const matched = row.status === 'MATCHED'
        return <article key={row.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
          <span className={matched ? 'flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700' : 'flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700'}>
            {matched ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{row.transactionId} · {formatCurrency(Number(row.amount))}</p>
            <p className="mt-1 text-xs text-muted-foreground">Shortcode {row.shortcode || 'STK'}{row.accountReference ? ` · Account ${row.accountReference}` : ''}{row.phone ? ` · ${row.phone}` : ''}</p>
          </div>
          <span className={matched ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800' : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800'}>
            {matched ? 'Matched' : 'Needs matching'}
          </span>
        </article>
      })}</div> : <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center text-muted-foreground"><Smartphone className="h-8 w-8 opacity-40" /><p className="mt-3 text-sm font-semibold">No M-Pesa receipts yet</p></div>}
    </section>
  </div>
}
