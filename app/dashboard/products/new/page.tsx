import { getProductCategories } from '@/app/actions/products'
import { ProductForm } from '@/components/products/product-form'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { PackagePlus } from 'lucide-react'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add product' }

export default async function NewProductPage({ searchParams }: { searchParams?: Promise<{ categoryId?: string }> }) {
  await requireWorkspaceModule('products')
  const categories = await getProductCategories()

  const categoryId = (await searchParams)?.categoryId
  return <div className="mx-auto max-w-[1480px] space-y-5">
    <DashboardPageHeading icon={PackagePlus} title="Add product" description="Create a POS-ready item with pricing, stock, an image and reorder settings." />
    <ProductForm categories={categories} initialCategoryId={categoryId} />
  </div>
}
