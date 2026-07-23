'use client'

import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { StockMovement } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface StockMovementHistoryProps {
  movements: StockMovement[]
  maxItems?: number
}

const movementTypeConfig = {
  sale: { label: 'Sale', icon: TrendingDown, color: 'bg-red-100 text-red-700', badgeClass: 'bg-red-50' },
  purchase: { label: 'Purchase', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700', badgeClass: 'bg-emerald-50' },
  adjustment: { label: 'Adjustment', icon: AlertTriangle, color: 'bg-blue-100 text-blue-700', badgeClass: 'bg-blue-50' },
  return: { label: 'Customer Return', icon: ArrowUp, color: 'bg-amber-100 text-amber-700', badgeClass: 'bg-amber-50' },
  damage: { label: 'Damage/Loss', icon: ArrowDown, color: 'bg-red-100 text-red-700', badgeClass: 'bg-red-50' },
} as const

export function StockMovementHistory({
  movements,
  maxItems = 10,
}: StockMovementHistoryProps) {
  const displayedMovements = movements.slice(0, maxItems)

  if (movements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No stock movements recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold mb-3">Stock Movement History</div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedMovements.map((movement) => {
          const config = movementTypeConfig[movement.type as keyof typeof movementTypeConfig] || 
                        movementTypeConfig.adjustment
          const Icon = movement.quantity > 0 ? ArrowUp : ArrowDown
          const isPositive = movement.quantity > 0

          return (
            <div
              key={movement.id}
              className={cn(
                'rounded-lg border p-3 flex items-start gap-3',
                config.badgeClass
              )}
            >
              {/* Icon */}
              <div className={cn('mt-0.5 p-1.5 rounded', config.color)}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {config.label}
                    {movement.reason && <span className="text-xs text-muted-foreground ml-1">({movement.reason})</span>}
                  </p>
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {isPositive ? '+' : ''}{movement.quantity}
                  </p>
                </div>

                {/* Stock change details */}
                <p className="text-xs text-muted-foreground mt-1">
                  {movement.stockBefore} → {movement.stockAfter}
                </p>

                {/* Metadata */}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(movement.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {movements.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{movements.length - maxItems} more movements
        </p>
      )}
    </div>
  )
}
