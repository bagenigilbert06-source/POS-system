import { getProductsPageData } from '@/app/actions/products'
import { ProductsTable } from '@/components/products/products-table'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'

export const metadata: Metadata = { title: 'Products' }
export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await getProductsPageData()

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={Package} title="Products" description="Manage your product catalog, pricing and stock setup." />

      <ProductsTable initialProducts={products} />
    </div>
  )
}
