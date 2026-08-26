import type { Metadata } from 'next'
import { Barcode } from 'lucide-react'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { getBarcodePageData } from '@/lib/services/barcode-page-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { BarcodePrintManager } from '@/components/barcode/barcode-print-manager'

export const metadata: Metadata = { title: 'Print barcodes' }
export const dynamic = 'force-dynamic'

export default async function BarcodesPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.PRODUCT_VIEW)
  const data = await getBarcodePageData(authorization)

  return (
    <div className="products-workspace mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading
        icon={Barcode}
        eyebrow="Inventory tools"
        title="Print barcodes"
        description="Create shelf-ready labels from products already in your catalogue."
        theme="adaptive"
      />
      <BarcodePrintManager {...data} />
    </div>
  )
}
