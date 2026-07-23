'use client'

import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Banknote, Smartphone, CreditCard, TrendingUp } from 'lucide-react'
import type { Sale } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface CustomerTransactionHistoryProps {
  transactions: Sale[]
  currency?: string
  maxItems?: number
  onSelectTransaction?: (transaction: Sale) => void
}

const paymentIcon = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
}

const paymentColor = {
  cash: 'text-amber-600',
  mpesa: 'text-red-600',
  card: 'text-blue-600',
}

export function CustomerTransactionHistory({
  transactions,
  currency = 'KES',
  maxItems = 10,
  onSelectTransaction,
}: CustomerTransactionHistoryProps) {
  const displayedTransactions = transactions.slice(0, maxItems)

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-3">Transaction History</h3>

      <div className="space-y-2 overflow-y-auto max-h-96">
        {displayedTransactions.map((transaction) => {
          const Icon = paymentIcon[transaction.paymentMethod as keyof typeof paymentIcon] || Banknote
          const colorClass = paymentColor[transaction.paymentMethod as keyof typeof paymentColor] || 'text-muted-foreground'

          return (
            <button
              key={transaction.id}
              onClick={() => onSelectTransaction?.(transaction)}
              className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                {/* Left content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
                    <p className="text-sm font-medium truncate capitalize">
                      {transaction.paymentMethod}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize ml-auto">
                      {transaction.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receipt #{transaction.receiptNo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>

                {/* Right content - amounts */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold tabular-nums">
                    {formatCurrency(parseFloat(transaction.total.toString()))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(transaction.taxAmount.toString()) > 0 && (
                      <>Tax: {formatCurrency(parseFloat(transaction.taxAmount.toString()))}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Discount indicator */}
              {parseFloat(transaction.discountAmount.toString()) > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1.5">
                  Discount: {formatCurrency(transaction.discountAmount)}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {transactions.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{transactions.length - maxItems} more transactions
        </p>
      )}

      {/* Summary */}
      <div className="rounded-lg bg-muted/30 p-3 mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Transactions:</span>
          <span className="font-bold">{transactions.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Amount:</span>
          <span className="font-bold text-primary">
            {formatCurrency(transactions.reduce((sum, t) => sum + parseFloat(t.total.toString()), 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
