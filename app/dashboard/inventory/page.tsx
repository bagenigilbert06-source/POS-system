import { getProducts } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { Boxes, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory' }

export default async function InventoryPage() {
  const products = await getProducts()

  const totalValue = products.reduce(
    (sum, p) => sum + parseFloat(p.buyingPrice) * p.stock,
    0
  )
  const outOfStock = products.filter((p) => p.stock === 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const wellStocked = products.filter((p) => p.stock > p.minStock)

  const stockStatus = (p: (typeof products)[0]) => {
    if (p.stock === 0) return 'out'
    if (p.stock <= p.minStock) return 'low'
    return 'ok'
  }

  const statusConfig = {
    ok: { label: 'In Stock', cls: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' },
    low: { label: 'Low Stock', cls: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]' },
    out: { label: 'Out of Stock', cls: 'bg-destructive/10 text-destructive' },
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Track stock levels and inventory value
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(totalValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total buying cost of stock</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
          <p className="mt-1.5 text-2xl font-semibold">{products.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active product lines</p>
        </div>
        <div className="metric-card border-[hsl(var(--warning)/0.4)]">
          <p className="text-sm font-medium text-[hsl(var(--warning))]">Low Stock</p>
          <p className="mt-1.5 text-2xl font-semibold">{lowStock.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Need restocking soon</p>
        </div>
        <div className="metric-card border-destructive/30">
          <p className="text-sm font-medium text-destructive">Out of Stock</p>
          <p className="mt-1.5 text-2xl font-semibold">{outOfStock.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Immediately required</p>
        </div>
      </div>

      {/* Priority alerts */}
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
            <p className="text-sm font-semibold text-[hsl(var(--warning))]">
              Restock Required — {outOfStock.length + lowStock.length} item(s)
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...outOfStock, ...lowStock].slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-background/80 border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku ?? 'No SKU'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={cn('text-sm font-bold', p.stock === 0 ? 'text-destructive' : 'text-[hsl(var(--warning))]')}>
                    {p.stock}
                  </p>
                  <p className="text-xs text-muted-foreground">/ min {p.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full inventory table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <h3 className="text-sm font-semibold">All Products</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
              {wellStocked.length} in stock
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
              {lowStock.length} low
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {outOfStock.length} out
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Current Stock</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Min Stock</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Buying Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock Value</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const status = stockStatus(p)
                const config = statusConfig[status]
                const stockValue = parseFloat(p.buyingPrice) * p.stock
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku ?? 'No SKU'}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums">
                      {p.stock} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                      {p.minStock} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(p.buyingPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(stockValue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', config.cls)}>
                        {config.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
