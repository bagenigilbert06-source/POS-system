import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, Pencil, Plus } from 'lucide-react'
import { getCategoryDetails } from '@/app/actions/categories'
import { getProductsForCategory } from '@/app/actions/products'
import { ProductsTable } from '@/components/products/products-table'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getCurrentProductTerminology } from '@/lib/products/current-terminology'
import { countProductTerm } from '@/lib/products/terminology'

export const dynamic = 'force-dynamic'

export default async function CategoryDetailsPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params
  const [details, products, terminology] = await Promise.all([
    getCategoryDetails(categoryId),
    getProductsForCategory(categoryId),
    getCurrentProductTerminology(),
  ])
  if (!details) notFound()
  const { category, children } = details

  return (
    <div className="products-workspace mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={Package} title={category.name} description={category.description || `${terminology.plural} assigned to this category.`} />
      <Link href="/dashboard/products/categories" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All categories</Link>
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-lg bg-[#fff8e8]">{category.imageUrl ? <Image src={category.imageUrl} alt="" width={80} height={80} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#9a6900]">#</div>}</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{category.isActive ? 'Active category' : 'Archived category'}</p>
              <h1 className="mt-1 text-2xl font-bold">{category.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{category.productCount} active {countProductTerm(terminology, category.productCount)} · {category.parentCategoryId ? 'Child category' : 'Top-level category'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/products/new?categoryId=${category.id}`} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />{terminology.add}</Link>
            <Link href="/dashboard/products/categories" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"><Pencil className="h-4 w-4" />Edit category</Link>
          </div>
        </div>
        {children.length > 0 && <div className="mt-5 border-t pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subcategories</p><div className="flex flex-wrap gap-2">{children.map((child) => <Link key={child.id} href={`/dashboard/products/categories/${child.id}`} className="rounded-full border bg-background px-3 py-1.5 text-sm hover:border-primary">{child.name} <span className="text-muted-foreground">{child.productCount}</span></Link>)}</div></div>}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold">{terminology.plural} in {category.name}</h2><p className="text-sm text-muted-foreground">Showing direct {terminology.pluralLower} assigned to this category.</p></div></div>
        <ProductsTable initialProducts={products} terminology={terminology} />
      </section>
    </div>
  )
}
