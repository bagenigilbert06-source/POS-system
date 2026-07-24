import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockLevelBadgeProps {
  stock: number
  minStock: number
  className?: string
}

export function StockLevelBadge({ stock, minStock, className }: StockLevelBadgeProps) {
  if (stock === 0) {
    return (
      <div className={cn('flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700', className)}>
        <AlertTriangle className="h-3 w-3" />
        Out of Stock
      </div>
    )
  }

  if (stock <= minStock) {
    return (
      <div className={cn('flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700', className)}>
        <AlertCircle className="h-3 w-3" />
        Low Stock
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700', className)}>
      <CheckCircle2 className="h-3 w-3" />
      In Stock
    </div>
  )
}
