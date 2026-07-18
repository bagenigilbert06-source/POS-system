import { getSales } from '@/app/actions/sales'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Receipt, Smartphone, Banknote, CreditCard, ArrowUpRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { ManualSaleDialog } from '@/components/sales/manual-sale-dialog'
import { db } from '@/lib/db'
import { businessSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Sales' }

const paymentIcon = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
}

const paymentBadgeCls: Record<string, string> = {
  cash: 'bg-[#fff3be] text-[#5f4900]',
  mpesa: 'bg-[#fff0f0] text-[#b51f21]',
  card: 'bg-[#eef0f4] text-[#344054]',
}

export default async function SalesPage() {
  const { config, organization } = await requireWorkspaceModule('sales')
  const [sales, [settings]] = await Promise.all([
    getSales(100),
    db.select({ paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled, pricesIncludeTax: businessSettings.pricesIncludeTax }).from(businessSettings).where(eq(businessSettings.organizationId, organization.id)).limit(1),
  ])
  const paymentMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  const completedSales = sales.filter((record) => record.status === 'completed')

  const totalRevenue = completedSales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const cashSales = completedSales.filter((s) => s.paymentMethod === 'cash')
  const mpesaSales = completedSales.filter((s) => s.paymentMethod === 'mpesa')
  const cashRevenue = cashSales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const mpesaRevenue = mpesaSales.reduce((sum, s) => sum + parseFloat(s.total), 0)

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <DashboardPageHeading icon={Receipt} title="Sales" description="Track completed transactions, payments and recorded revenue." action={config.enabledModules.includes('pos') ? <Link
          href="/dashboard/pos"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#050a1f] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New sale
        </Link> : <ManualSaleDialog paymentMethods={paymentMethods} taxEnabled={settings?.taxEnabled ?? false} pricesIncludeTax={settings?.pricesIncludeTax ?? false} />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{completedSales.length} completed transactions</p>
            </div>
            <span className="rounded-md bg-[#fff3be] p-2 text-[#050a1f]">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cash</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(cashRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{cashSales.length} transactions</p>
            </div>
            <span className="rounded-md bg-[#fff3be] p-2 text-[#050a1f]">
              <Banknote className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">M-Pesa</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(mpesaRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{mpesaSales.length} transactions</p>
            </div>
            <span className="rounded-md bg-[#fff0f0] p-2 text-[#e42527]">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <p className="text-sm font-medium text-muted-foreground">Average Sale</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatCurrency(completedSales.length ? totalRevenue / completedSales.length : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across all payment methods</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:bg-card">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Transactions</h3>
            <p className="text-xs text-muted-foreground">Latest 100 sales records</p>
          </div>
        </div>
        {sales.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">No sales yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Open the POS terminal to start processing sales.
            </p>
            <Link
              href="/dashboard/pos"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#e42527] px-4 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Start selling
            </Link>
          </div>
        ) : (
          <>
          <div className="grid gap-3 p-3 md:hidden">
            {sales.map((record) => { const Icon = paymentIcon[record.paymentMethod as keyof typeof paymentIcon] ?? Banknote; return <article key={record.id} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold">{record.receiptNo}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</p></div><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize', paymentBadgeCls[record.paymentMethod] ?? 'bg-secondary')}><Icon className="h-3 w-3" />{record.paymentMethod}</span></div><div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-sm font-semibold capitalize">{record.status}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 text-lg font-extrabold tabular-nums">{formatCurrency(record.total)}</p></div></div></article> })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-[#fafaf8] dark:bg-background">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Payment</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Subtotal</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tax</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const Icon = paymentIcon[s.paymentMethod as keyof typeof paymentIcon] ?? Banknote
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{s.receiptNo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                            paymentBadgeCls[s.paymentMethod] ?? 'bg-secondary text-secondary-foreground'
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {s.paymentMethod}
                          {s.mpesaRef ? ` · ${s.mpesaRef}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(s.subtotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(s.taxAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-[#fff3be] px-2.5 py-0.5 text-xs font-bold text-[#5f4900] capitalize">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div></>
        )}
      </div>
    </div>
  )
}
