import { Banknote, CreditCard, Smartphone, WalletCards } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface PaymentRow {
  method: string
  revenue: number
  transactions: number
}

const methodDetails = {
  cash: { label: 'Cash', icon: Banknote, color: 'var(--dashboard-chart-secondary)' },
  mpesa: { label: 'M-Pesa', icon: Smartphone, color: 'var(--dashboard-success)' },
  card: { label: 'Card', icon: CreditCard, color: 'var(--dashboard-muted)' },
  bank_transfer: { label: 'Bank transfer', icon: WalletCards, color: 'var(--dashboard-chart-revenue)' },
} as const

export function PaymentMix({ data, currency }: { data: PaymentRow[]; currency: string }) {
  const total = data.reduce((sum, row) => sum + row.revenue, 0)

  return (
    <article className="app-panel overflow-hidden">
      <div className="flex items-start justify-between border-b px-4 py-4 sm:px-5">
        <div><h2>Payment mix</h2><p className="mt-1 text-xs text-muted-foreground">How completed sales were paid</p></div>
        <WalletCards className="h-4 w-4 text-[var(--dashboard-accent)]" />
      </div>
      {total > 0 ? <div className="space-y-5 p-4 sm:p-5">{data.map((row) => {
        const detail = methodDetails[row.method as keyof typeof methodDetails]
        const Icon = detail?.icon ?? WalletCards
        const label = detail?.label ?? row.method.replaceAll('_', ' ')
        const color = detail?.color ?? 'var(--dashboard-chart-tick)'
        const percentage = total ? row.revenue / total * 100 : 0
        return <div key={row.method}><div className="mb-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--dashboard-surface-subtle)]"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-xs font-semibold capitalize">{label}</p><p className="text-[10px] text-muted-foreground">{row.transactions.toLocaleString('en-KE')} transactions</p></div><div className="ml-auto text-right"><p className="text-xs font-semibold tabular-nums">{formatCurrency(row.revenue, currency)}</p><p className="text-[10px] text-muted-foreground tabular-nums">{percentage.toFixed(1)}%</p></div></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--dashboard-surface-subtle)]"><div className="h-full rounded-full" style={{ width: `${percentage}%`, background: color }} /></div></div>
      })}</div> : <div className="flex h-[220px] items-center justify-center px-6 text-center"><div><p className="text-sm font-semibold">No payment data yet</p><p className="mt-1 text-xs text-muted-foreground">Payment mix appears after completed sales.</p></div></div>}
    </article>
  )
}
