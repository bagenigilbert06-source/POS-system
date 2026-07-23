'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface LowStockAlertWidgetProps {
  products: Product[]
  maxItems?: number
}

export function LowStockAlertWidget({ products, maxItems = 5 }: LowStockAlertWidgetProps) {
  const lowStockItems = products
    .filter(p => p.isActive && p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, maxItems)

  const outOfStock = lowStockItems.filter(p => p.stock === 0).length
  const lowStock = lowStockItems.filter(p => p.stock > 0 && p.stock <= p.minStock).length

  if (lowStockItems.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">Stock Alerts</h3>
          <p className="text-xs text-amber-800 mt-0.5">
            {outOfStock} out of stock · {lowStock} low stock
          </p>
          
          {/* Items list */}
          <ul className="mt-2.5 space-y-1.5 text-sm">
            {lowStockItems.map((product) => (
              <li key={product.id} className="flex items-center justify-between">
                <span className="text-amber-900">
                  {product.name}
                  <span className={cn(
                    'ml-2 inline-block rounded px-2 py-0.5 text-xs font-semibold',
                    product.stock === 0 
                      ? 'bg-red-200 text-red-800'
                      : 'bg-amber-200 text-amber-800'
                  )}>
                    {product.stock} left
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Action */}
          <Link
            href="/dashboard/inventory"
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors"
          >
            View Inventory
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
