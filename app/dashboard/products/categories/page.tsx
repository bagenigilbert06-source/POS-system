import { getCategories } from '@/app/actions/categories'
import { CategoriesClient } from '@/components/products/categories-client'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { Tags } from 'lucide-react'

export const metadata = { title: 'Product categories' }
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await getCategories(true)
  return <div className="products-workspace mx-auto max-w-[1480px] space-y-5"><DashboardPageHeading icon={Tags} title="Product categories" description="Organize your catalogue into clear, searchable groups." theme="adaptive" /><CategoriesClient initialCategories={categories} /></div>
}
