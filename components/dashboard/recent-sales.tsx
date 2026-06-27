import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import type { Sale } from '@/lib/db/schema'

const paymentBadge: Record<string, string> = {
  cash: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  mpesa: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
  card: 'bg-secondary text-secondary-foreground',
}

interface RecentSalesProps {
  sales: Sale[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <div className="metric-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Transactions</h3>
        <Link
          href="/dashboard/sales"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sales yet. Open the POS terminal to start selling.</p>
      ) : (
        <ul className="divide-y">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.receiptNo}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${paymentBadge[s.paymentMethod] ?? 'bg-secondary text-secondary-foreground'}`}
                >
                  {s.paymentMethod}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(s.total)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
