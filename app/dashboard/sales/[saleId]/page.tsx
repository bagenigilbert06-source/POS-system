import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSaleWithItems } from '@/app/actions/sales'
import { getBusinessSettings } from '@/app/actions/business'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { SaleDetailPage } from '@/components/sales/sale-detail-page'

export const metadata: Metadata = { title: 'Transaction details' }

export default async function TransactionDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  await requireWorkspaceModule('sales')
  const { saleId } = await params
  const [detail, settings] = await Promise.all([getSaleWithItems(saleId), getBusinessSettings()])
  if (!detail) notFound()
  return <SaleDetailPage detail={detail} settings={settings} />
}
