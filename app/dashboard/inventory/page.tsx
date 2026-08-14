import type { Metadata } from 'next'
import { AlertTriangle, Boxes, ClipboardCheck, PackageCheck, WalletCards } from 'lucide-react'
import { getProductsPageData } from '@/app/actions/products'
import { getInventoryControlData } from '@/app/actions/stock-adjustments'
import { getInventoryLifecycleData } from '@/app/actions/inventory-lifecycle'
import { getProcurementData } from '@/app/actions/purchases'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { InventoryManager } from '@/components/inventory/inventory-manager'
import { InventoryLifecycleManager } from '@/components/inventory/inventory-lifecycle-manager'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { PermissionEnum } from '@/lib/types/permissions'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Inventory control | Pesaby' }
export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const authorization = await getAuthorizationContext()
  const canPurchase = authorization.permissions.includes(PermissionEnum.PURCHASE_MANAGE)
  const canViewPurchases = authorization.permissions.includes(PermissionEnum.PURCHASE_VIEW)
  const [{ organization }, products, control, lifecycle, procurement] = await Promise.all([
    requireWorkspaceModule('inventory'),
    getProductsPageData(),
    getInventoryControlData(),
    getInventoryLifecycleData(),
    canViewPurchases ? getProcurementData() : Promise.resolve({ suppliers: [], purchases: [], purchaseItems: [], receipts: [], products: [], movements: [], branches: [], supplierProducts: [] }),
  ])
  const activeProducts = products.filter((item) => item.isActive)
  const totalValue = activeProducts.reduce((sum, item) => sum + Number(item.buyingPrice) * item.stock, 0)
  const outOfStock = activeProducts.filter((item) => item.stock <= 0)
  const lowStock = activeProducts.filter((item) => item.stock > 0 && item.stock <= item.minStock)
  const pendingCounts = control.adjustments.filter((item) => item.status === 'pending')
  const canAdjust = authorization.permissions.includes(PermissionEnum.INVENTORY_ADJUST)

  const metrics = [
    { label: 'Inventory value', value: formatCurrency(totalValue, organization.currency), detail: 'Current buying cost on hand', icon: WalletCards, tone: 'default' },
    { label: 'Active SKUs', value: String(activeProducts.length), detail: `${activeProducts.reduce((sum, item) => sum + item.stock, 0)} total units tracked`, icon: PackageCheck, tone: 'default' },
    { label: 'Replenishment', value: String(lowStock.length + outOfStock.length), detail: `${lowStock.length} low · ${outOfStock.length} out of stock`, icon: AlertTriangle, tone: lowStock.length + outOfStock.length ? 'warning' : 'success' },
    { label: 'Pending counts', value: String(pendingCounts.length), detail: pendingCounts.length ? 'Awaiting review and approval' : 'All physical counts reviewed', icon: ClipboardCheck, tone: pendingCounts.length ? 'warning' : 'success' },
  ] as const

  return <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
    <DashboardPageHeading theme="adaptive" icon={Boxes} eyebrow="Stock control" title="Inventory" description="Count, replenish, adjust and audit every change to stock on hand." />

    <section aria-label="Inventory summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="metric-card min-h-[132px]"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><span className={tone === 'warning' ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : tone === 'success' ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground'}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>)}
    </section>

    <InventoryManager products={activeProducts} movements={control.movements} adjustments={control.adjustments} adjustmentItems={control.adjustmentItems} balances={control.balances} branches={control.branches} currency={organization.currency} canAdjust={canAdjust} canPurchase={canPurchase} />
    <InventoryLifecycleManager products={activeProducts} suppliers={procurement.suppliers} branches={lifecycle.branches} purchaseOrders={lifecycle.purchaseOrders} poItems={lifecycle.poItems} transfers={lifecycle.transfers} transferItems={lifecycle.transferItems} currency={organization.currency} canPurchase={canPurchase} canTransfer={authorization.permissions.includes(PermissionEnum.INVENTORY_TRANSFER)} />
  </div>
}
