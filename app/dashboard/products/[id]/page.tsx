import { getProductCategories, getProductOverview } from '@/app/actions/products'
import { ProductForm } from '@/components/products/product-form'
import { ProductDetails } from '@/components/products/product-details'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Edit product' }
export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ edit?: string }> }) {
  const { id } = await params
  const editing = (await searchParams)?.edit === 'true'
  const overview = await getProductOverview(id)
  if (!overview) notFound()
  const item = overview.product
  const categories = editing ? await getProductCategories() : []
  return <div className="products-workspace mx-auto max-w-[1480px] space-y-5">
    <DashboardPageHeading icon={Package} eyebrow={editing ? 'Edit product' : 'Pesaby workspace'} title={item.name} description={editing ? 'Update product details, pricing, stock controls and POS image.' : 'Product overview, pricing and inventory status.'} theme="adaptive" />
    {editing ? <ProductForm product={item} categories={categories} /> : <ProductDetails overview={overview} />}
  </div>
}
