import { getCategories } from '@/app/actions/categories'
import { CategoriesClient } from '@/components/products/categories-client'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { Tags } from 'lucide-react'
import { getCurrentProductTerminology } from '@/lib/products/current-terminology'

export async function generateMetadata() {
  const terminology = await getCurrentProductTerminology()
  return { title: `${terminology.singular} categories` }
}
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const [categories, terminology] = await Promise.all([getCategories(true), getCurrentProductTerminology()])
  return <div className="products-workspace mx-auto max-w-[1480px] space-y-5"><DashboardPageHeading icon={Tags} title={`${terminology.singular} categories`} description={`Organize your ${terminology.singularLower} catalogue into clear, searchable groups.`} theme="adaptive" /><CategoriesClient initialCategories={categories} /></div>
}
