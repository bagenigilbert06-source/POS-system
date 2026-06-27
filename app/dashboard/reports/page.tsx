import { getSales } from '@/app/actions/sales'
import { getProducts } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { ReportsCharts } from '@/components/reports/reports-charts'
import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const [sales, products] = await Promise.all([getSales(500), getProducts()])

  // Compute monthly breakdown from sales
  const monthlyMap: Record<string, { revenue: number; count: number }> = {}
  for (const s of sales) {
    const key = new Date(s.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, count: 0 }
    monthlyMap[key].revenue += parseFloat(s.total)
    monthlyMap[key].count += 1
  }
  const monthlyData = Object.entries(monthlyMap)
    .map(([month, data]) => ({ month, ...data }))
    .slice(-6)

  // Payment method breakdown
  const paymentMap: Record<string, number> = {}
  for (const s of sales) {
    paymentMap[s.paymentMethod] = (paymentMap[s.paymentMethod] ?? 0) + parseFloat(s.total)
  }
  const paymentData = Object.entries(paymentMap).map(([method, amount]) => ({
    method: method.charAt(0).toUpperCase() + method.slice(1),
    amount,
  }))

  // Top products by (approximate) sales — count unique product appearances from product names
  const productSaleMap: Record<string, number> = {}
  for (const s of sales) {
    // We'll use a placeholder; real data would join sale_items
  }

  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const totalTax = sales.reduce((sum, s) => sum + parseFloat(s.taxAmount), 0)
  const totalDiscount = sales.reduce((sum, s) => sum + parseFloat(s.discountAmount), 0)
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

  const inventoryValue = products.reduce(
    (sum, p) => sum + parseFloat(p.buyingPrice) * p.stock,
    0
  )
  const potentialRevenue = products.reduce(
    (sum, p) => sum + parseFloat(p.sellingPrice) * p.stock,
    0
  )

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Reports</h1>
            <p className="text-sm text-muted-foreground">Business performance overview</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">All-time from {sales.length} sales</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(avgOrderValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">VAT Collected</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(totalTax)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total tax remittable</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Total Discounts</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(totalDiscount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Given to customers</p>
        </div>
      </div>

      {/* Inventory value */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Inventory Cost</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(inventoryValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cost of {products.length} products at buying price
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-muted-foreground">Potential Revenue</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatCurrency(potentialRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            If all stock sold at selling price (KES {formatCurrency(potentialRevenue - inventoryValue)} gross margin)
          </p>
        </div>
      </div>

      {/* Charts */}
      <ReportsCharts monthlyData={monthlyData} paymentData={paymentData} />
    </div>
  )
}
