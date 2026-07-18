import { getProducts } from '@/app/actions/products'
import { ProductsTable } from '@/components/products/products-table'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'

export const metadata: Metadata = { title: 'Products' }

export default async function ProductsPage() {
  await requireWorkspaceModule('products')
  const products = await getProducts(undefined, true)

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={Package} title="Products" description="Manage your product catalog, pricing and stock setup." />

      <ProductsTable initialProducts={products} />
    </div>
  )
}
