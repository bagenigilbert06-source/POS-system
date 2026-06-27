import { getSales } from '@/app/actions/sales'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Receipt, Smartphone, Banknote, CreditCard } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Sales</h1>
            <p className="text-sm text-muted-foreground">View all transactions</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{sales.length} transactions</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-[hsl(var(--success))]" />
            <p className="text-sm font-medium text-muted-foreground">Cash</p>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(cashRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{cashSales.length} transactions</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-[hsl(var(--info))]" />
            <p className="text-sm font-medium text-muted-foreground">M-Pesa</p>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(mpesaRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{mpesaSales.length} transactions</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="border-b px-4 py-3 bg-muted/30">
          <h3 className="text-sm font-semibold">All Transactions</h3>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No sales yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Open the POS terminal to start processing sales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
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
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
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
