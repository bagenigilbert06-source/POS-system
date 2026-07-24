import { getProducts } from '@/app/actions/products'
import { getCustomers } from '@/app/actions/customers'
import { getBusinessSettings } from '@/app/actions/business'
import { POSTerminal } from '@/components/pos/pos-terminal'
import type { Metadata } from 'next'
import { ReceiptText } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'

export const metadata: Metadata = { title: 'POS Terminal' }

export default async function POSPage() {
  const { config } = await requireWorkspaceModule('pos')
  const [products, customers, settings] = await Promise.all([
    getProducts(),
    config.enabledModules.includes('customers') ? getCustomers() : Promise.resolve([]),
    getBusinessSettings(),
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={ReceiptText} title="Point of sale" description="Process complete sales with the payment methods configured for your workspace." />
      <POSTerminal products={products} customers={customers} settings={settings} />
    </div>
  )
}
