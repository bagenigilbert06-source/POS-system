import { getSalesAnalytics, getSalesFilterOptions, getSalesPageData, type SalesPageFilters } from '@/app/actions/sales'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { SalesManagementView } from '@/components/sales/sales-management-view'
import { ManualSaleDialog } from '@/components/sales/manual-sale-dialog'
import { db } from '@/lib/db'
import { businessSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sales' }

function dateValue(value?: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function SalesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { config, organization } = await requireWorkspaceModule('sales')
  const params = await searchParams
  const value = (key: string) => { const item = params?.[key]; return Array.isArray(item) ? item[0] : item }
  const filters: SalesPageFilters = { search: value('search'), paymentMethod: value('payment'), status: value('status'), customerId: value('customer'), cashierId: value('cashier'), branchId: value('branch'), from: dateValue(value('from')), to: dateValue(value('to')), page: Number(value('page') ?? 1), pageSize: Number(value('pageSize') ?? 50), sort: (value('sort') as SalesPageFilters['sort']) ?? 'date', direction: value('direction') === 'asc' ? 'asc' : 'desc' }
  const [data, options, analytics, [settings]] = await Promise.all([getSalesPageData(filters), getSalesFilterOptions(), getSalesAnalytics(filters), db.select({ paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled, pricesIncludeTax: businessSettings.pricesIncludeTax }).from(businessSettings).where(eq(businessSettings.organizationId, organization.id)).limit(1)])
  const hasPos = config.enabledModules.includes('pos')
  const paymentMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  return <SalesManagementView data={data} filters={filters} options={options} analytics={analytics} hasPos={hasPos} manualSale={!hasPos ? <ManualSaleDialog paymentMethods={paymentMethods} taxEnabled={settings?.taxEnabled ?? false} pricesIncludeTax={settings?.pricesIncludeTax ?? false} /> : null} />
}
