import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { Product } from '@/lib/db/schema'

interface LowStockAlertProps {
  products: Product[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  return (
    <div className="metric-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--warning)/0.12)]">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
          </div>
          <h3 className="text-sm font-semibold">Low Stock Alerts</h3>
        </div>
        {products.length > 0 && (
          <Link
            href="/dashboard/inventory"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">All products are well stocked.</p>
      ) : (
        <ul className="space-y-2">
          {products.slice(0, 6).map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md bg-[hsl(var(--warning)/0.06)] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.sku ?? 'No SKU'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-sm font-semibold text-[hsl(var(--warning))]">
                  {p.stock} {p.unit}
                </span>
                <span className="text-xs text-muted-foreground">/ min {p.minStock}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
