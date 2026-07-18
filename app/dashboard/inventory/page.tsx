import { getProducts } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { Boxes, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'

export const metadata: Metadata = { title: 'Inventory' }

export default async function InventoryPage() {
  await requireWorkspaceModule('inventory')
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
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={Boxes} title="Inventory" description="Track stock levels, reorder needs and recorded inventory cost." />

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
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">All Products</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
        {products.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><Boxes className="h-7 w-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">No inventory yet</p><p className="mt-1 text-sm text-muted-foreground">Add an active product to start tracking stock.</p></div> : <>
        <div className="grid gap-3 p-3 md:hidden">
          {products.map((p) => { const status = stockStatus(p); const config = statusConfig[status]; return <article key={p.id} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.sku || 'No SKU'}</p></div><span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', config.cls)}>{config.label}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Current stock</dt><dd className="mt-1 font-bold tabular-nums">{p.stock} {p.unit}</dd></div><div><dt className="text-xs text-muted-foreground">Stock cost</dt><dd className="mt-1 font-bold tabular-nums">{formatCurrency(parseFloat(p.buyingPrice) * p.stock)}</dd></div></dl></article> })}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
        </div></>}
      </div>
    </div>
  )
}
