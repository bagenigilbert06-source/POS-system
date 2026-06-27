import { getProducts } from '@/app/actions/products'
import { ProductsTable } from '@/components/products/products-table'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Products' }

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog and pricing
            </p>
          </div>
        </div>
      </div>

      <ProductsTable initialProducts={products} />
    </div>
  )
}
