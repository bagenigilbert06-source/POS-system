import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Edit3, Package } from 'lucide-react'
import type { Product } from '@/lib/db/schema'
import { formatCurrency } from '@/lib/utils'
import { getGrossMargin } from '@/lib/pricing/gross-margin'
import { StockHistoryChart } from './stock-history-chart'

type ProductOverview = {
  product: Product
  categoryName: string | null
  metrics: { unitsSoldToday: number; unitsSoldMonth: number; revenueMonth: number; grossProfitMonth: number; averageDailySales: number; stockValue: number; estimatedStockDays: number | null }
  movements: Array<{ id: string; type: string; quantity: number; stockBefore: number; stockAfter: number; reason: string | null; createdAt: Date }>
  purchases: Array<{ id: string; purchaseNo: string; supplierName: string; reference: string | null; receivedAt: Date; quantity: number; unitCost: string; totalCost: string }>
}

export function ProductDetails({ overview }: { overview: ProductOverview }) {
  const { product, categoryName, metrics, movements, purchases } = overview
  const buying = Number(product.buyingPrice)
  const selling = Number(product.sellingPrice)
  const profit = selling - buying
  const grossMargin = getGrossMargin(selling, buying)
  const status = !product.isActive ? 'Archived' : product.stock === 0 ? 'Out of stock' : product.stock <= product.minStock ? 'Low stock' : 'In stock'
  const stockHistory = [...movements].reverse().map((movement) => ({ date: movement.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), stock: movement.stockAfter }))

  return <div className="mx-auto max-w-[1100px] space-y-5">
    <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
    <section className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-sm"><div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[300px_1fr]">
      <div className="flex h-[280px] items-center justify-center overflow-hidden rounded-lg bg-[#fff8e8] text-[#8a6500]">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} width={600} height={600} unoptimized className="h-full w-full object-cover" /> : <Package className="h-16 w-16" />}</div>
      <div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#9a6900]">{categoryName ?? 'Product'}</p><h1 className="mt-1 text-2xl font-bold text-[#101828]">{product.name}</h1><p className="mt-2 text-sm text-muted-foreground">{product.sku ? `SKU ${product.sku}` : 'No SKU'}{product.barcode ? ` · Barcode ${product.barcode}` : ''}{product.unitsPerPack && product.unitsPerPack > 1 ? ` · Pack of ${product.unitsPerPack}` : ''}</p></div><span className="rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-semibold text-[#28743c]">{status}</span></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><Metric label="Selling price" value={formatCurrency(selling)} /><Metric label="Cost price" value={formatCurrency(buying)} /><Metric label="Profit per unit" value={formatCurrency(profit)} /><Metric label="Current profit %" value={grossMargin.valid ? `${grossMargin.percent.toFixed(1)}%` : 'Check cost price'} /></div><p className="mt-3 text-xs text-muted-foreground">Profit % uses today&apos;s cost price. Sales reports show realized profit using the cost captured when each sale was completed.</p><div className="mt-6 flex flex-wrap gap-2"><Link href={`/dashboard/products/${product.id}?edit=true`} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Edit3 className="h-4 w-4" /> Edit product</Link></div></div>
    </div></section>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Available stock" value={`${product.stock} ${product.unit}`} /><Metric label="Units sold today" value={`${metrics.unitsSoldToday} ${product.unit}`} /><Metric label="Units sold this month" value={`${metrics.unitsSoldMonth} ${product.unit}`} /><Metric label="Revenue this month" value={formatCurrency(metrics.revenueMonth)} /><Metric label="Gross profit this month" value={formatCurrency(metrics.grossProfitMonth)} /><Metric label="Average daily sales" value={`${metrics.averageDailySales.toFixed(1)} ${product.unit}`} /><Metric label="Stock value" value={formatCurrency(metrics.stockValue)} /><Metric label="Estimated stock days" value={metrics.estimatedStockDays === null ? 'Not enough sales data' : `${metrics.estimatedStockDays.toFixed(0)} days`} /></section>
    <HistoryPanel title="Stock level"><StockHistoryChart data={stockHistory} unit={product.unit} alertLevel={product.minStock} /></HistoryPanel>
    <section className="grid gap-5 lg:grid-cols-2"><HistoryPanel title="Recent stock movements"><div className="divide-y">{movements.length ? movements.map((movement) => <div key={movement.id} className="flex items-start justify-between gap-3 py-3 text-sm"><div><p className="font-medium capitalize">{movement.type.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{movement.reason || 'No reason supplied'} · {movement.createdAt.toLocaleDateString()}</p></div><div className="text-right"><p className={movement.quantity >= 0 ? 'font-semibold text-[#28743c]' : 'font-semibold text-destructive'}>{movement.quantity >= 0 ? '+' : ''}{movement.quantity}</p><p className="text-xs text-muted-foreground">{movement.stockBefore} → {movement.stockAfter}</p></div></div>) : <EmptyHistory text="No stock movements recorded yet." />}</div></HistoryPanel><HistoryPanel title="Recent purchases"><div className="divide-y">{purchases.length ? purchases.map((purchase) => <div key={purchase.id} className="flex items-start justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{purchase.supplierName}</p><p className="mt-1 text-xs text-muted-foreground">{purchase.purchaseNo} · {purchase.receivedAt.toLocaleDateString()}</p></div><div className="text-right"><p className="font-semibold">{purchase.quantity} {product.unit}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(purchase.unitCost))} each</p></div></div>) : <EmptyHistory text="No purchases recorded yet." />}</div></HistoryPanel></section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-[#fafbfc] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-[#101828]">{value}</p></div> }
function HistoryPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{title}</h2>{children}</section> }
function EmptyHistory({ text }: { text: string }) { return <p className="py-5 text-sm text-muted-foreground">{text}</p> }
