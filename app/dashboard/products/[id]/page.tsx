import { getProductCategories, getProductOverview, getProductPackages } from '@/app/actions/products'
import { ProductForm } from '@/components/products/product-form'
import { ProductDetails } from '@/components/products/product-details'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductPackagesManager } from '@/components/products/product-packages-manager'
import { getCurrentProductTerminology } from '@/lib/products/current-terminology'

export async function generateMetadata(): Promise<Metadata> {
  const terminology = await getCurrentProductTerminology()
  return { title: `Edit ${terminology.singularLower}` }
}
export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ edit?: string }> }) {
  const { id } = await params
  const editing = (await searchParams)?.edit === 'true'
  const [overview, terminology] = await Promise.all([getProductOverview(id), getCurrentProductTerminology()])
  if (!overview) notFound()
  const item = overview.product
  const categories = editing ? await getProductCategories() : []
  const packages = await getProductPackages(id)
  return <div className="products-workspace mx-auto max-w-[1480px] space-y-5">
    <DashboardPageHeading icon={Package} eyebrow={editing ? `Edit ${terminology.singularLower}` : 'Pesaby workspace'} title={item.name} description={editing ? `Update ${terminology.singularLower} details, pricing, stock controls and POS image.` : `${terminology.singular} overview, pricing and inventory status.`} theme="adaptive" />
    {editing ? <ProductForm product={item} pharmacyMetadata={overview.pharmacyMetadata} categories={categories} /> : <><ProductDetails overview={overview} /><ProductPackagesManager productId={id} initialPackages={packages} pharmacyMode={Boolean(overview.pharmacyMetadata)} baseUnitLabel={item.unit} /></>}
  </div>
}
