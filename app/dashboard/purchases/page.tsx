import type { Metadata } from 'next'
import { Truck, Users, PackageCheck, CircleDollarSign } from 'lucide-react'
import { getProcurementData } from '@/app/actions/purchases'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ProcurementManager } from '@/components/purchases/procurement-manager'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Purchases & suppliers | Pesaby' }

export default async function PurchasesPage() {
  const { organization } = await requireWorkspaceModule('purchases')
  const data = await getProcurementData()
  const currency = organization.currency || 'KES'
  const total = data.purchases.reduce((sum, item) => sum + Number(item.total), 0)
  const unpaid = data.purchases.filter((item) => item.paymentStatus !== 'paid').reduce((sum, item) => sum + Number(item.total), 0)
  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><DashboardPageHeading icon={Truck} title="Purchases & suppliers" description="Receive goods, update stock, and retain a traceable supplier history." /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    ['Suppliers', String(data.suppliers.length), 'Active supplier records', Users], ['Purchases', String(data.purchases.length), 'Recent receipts', PackageCheck], ['Purchased value', formatCurrency(total, currency), 'All loaded receipts', CircleDollarSign], ['Outstanding', formatCurrency(unpaid, currency), 'Unpaid and part-paid', CircleDollarSign],
  ].map(([label,value,detail,Icon]) => { const MetricIcon = Icon as typeof Truck; return <article key={label as string} className="metric-card"><MetricIcon className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-muted-foreground">{label as string}</p><p className="mt-1 text-2xl font-extrabold tracking-tight">{value as string}</p><p className="mt-1 text-xs text-muted-foreground">{detail as string}</p></article> })}</section><ProcurementManager suppliers={data.suppliers} purchases={data.purchases} products={data.products} movements={data.movements} currency={currency} /></div>
}
