import { getSales } from '@/app/actions/sales'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Receipt, Smartphone, Banknote, CreditCard, ArrowUpRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sales' }

const paymentIcon = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
}

const paymentBadgeCls: Record<string, string> = {
  cash: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  mpesa: 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]',
  card: 'bg-secondary text-secondary-foreground',
}

export default async function SalesPage() {
  const sales = await getSales(100)

  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const cashSales = sales.filter((s) => s.paymentMethod === 'cash')
  const mpesaSales = sales.filter((s) => s.paymentMethod === 'mpesa')
  const cashRevenue = cashSales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const mpesaRevenue = mpesaSales.reduce((sum, s) => sum + parseFloat(s.total), 0)

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#e4efe7] text-[#1f5132] dark:bg-primary/15 dark:text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sales</h1>
            <p className="text-sm text-muted-foreground">Track transactions, payments, and daily revenue</p>
          </div>
        </div>
        <Link
          href="/dashboard/pos"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f5132] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#174327]"
        >
          <Plus className="h-4 w-4" />
          New sale
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sales.length} transactions</p>
            </div>
            <span className="rounded-md bg-[#e4efe7] p-2 text-[#1f5132]">
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
            <span className="rounded-md bg-green-50 p-2 text-green-700 dark:bg-green-950">
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
            <span className="rounded-md bg-blue-50 p-2 text-blue-700 dark:bg-blue-950">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-card">
          <p className="text-sm font-medium text-muted-foreground">Average Sale</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatCurrency(sales.length ? totalRevenue / sales.length : 0)}
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
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f5132] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#174327]"
            >
              <Plus className="h-4 w-4" />
              Start selling
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        <span className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--success))] capitalize">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
