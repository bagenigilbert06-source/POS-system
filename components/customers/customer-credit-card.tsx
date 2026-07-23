'use client'

import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Gift, Phone, Mail, MapPin, CreditCard, Zap, TrendingUp } from 'lucide-react'
import type { Customer } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface CustomerCreditCardProps {
  customer: Customer
  totalSpent?: number
  transactionCount?: number
  lastTransactionDate?: Date
  creditBalance?: number
  onSelect?: () => void
}

export function CustomerCreditCard({
  customer,
  totalSpent = 0,
  transactionCount = 0,
  lastTransactionDate,
  creditBalance = 0,
  onSelect,
}: CustomerCreditCardProps) {
  const loyaltyTier = customer.loyaltyPoints > 5000 ? 'Gold' :
                     customer.loyaltyPoints > 2000 ? 'Silver' :
                     customer.loyaltyPoints > 500 ? 'Bronze' : 'Regular'

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-lg border bg-card p-4 hover:border-primary hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{customer.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              loyaltyTier === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
              loyaltyTier === 'Silver' ? 'bg-gray-100 text-gray-700' :
              loyaltyTier === 'Bronze' ? 'bg-amber-100 text-amber-700' :
              'bg-muted text-muted-foreground'
            )}>
              {loyaltyTier}
            </span>
            {creditBalance > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Credit: {formatCurrency(creditBalance)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Loyalty Points</p>
          <p className="text-lg font-bold text-primary">{customer.loyaltyPoints.toLocaleString()}</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 text-xs text-muted-foreground mb-3 pb-3 border-b">
        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-sm font-bold mt-0.5">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="rounded bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-sm font-bold mt-0.5">{transactionCount}</p>
        </div>
        <div className="rounded bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Last Purchase</p>
          <p className="text-sm font-bold mt-0.5">
            {lastTransactionDate ? formatDateTime(lastTransactionDate).split(' ')[0] : '—'}
          </p>
        </div>
      </div>
    </button>
  )
}
