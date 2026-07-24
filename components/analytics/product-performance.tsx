'use client'

import { TrendingUp, Package } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface ProductPerf {
  id: string
  name: string
  revenue: number
  units: number
  trend: 'up' | 'down' | 'stable'
  margin: number
}

interface ProductPerformanceProps {
  products: ProductPerf[]
  currency: string
}

export function ProductPerformance({ products, currency }: ProductPerformanceProps) {
  if (!products.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-bold">Top products</h2><p className="mt-1 text-sm text-muted-foreground">Best performing products by revenue</p></div>
            <Package className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex h-40 items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No product data</p><p className="text-xs text-muted-foreground mt-1">Data will appear after sales are recorded</p></div>
        </div>
      </article>
    )
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold">Top products</h2><p className="mt-1 text-sm text-muted-foreground">Best performing products by revenue</p></div>
          <Package className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="divide-y">
        {products.map((product, idx) => (
          <div key={product.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5 hover:bg-muted/50 transition-colors">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-accent-foreground">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{formatNumber(product.units)} units • {product.margin}% margin</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{formatCurrency(product.revenue, currency)}</p>
              <p className={`text-xs flex items-center justify-end gap-1 font-medium ${
                product.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                product.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-muted-foreground'
              }`}>
                {product.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {product.trend === 'down' && <span>↓</span>}
                {product.trend === 'stable' && <span>→</span>}
                {product.trend === 'up' ? 'Up' : product.trend === 'down' ? 'Down' : 'Stable'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
