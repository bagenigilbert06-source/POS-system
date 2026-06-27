import { getProducts } from '@/app/actions/products'
import { getCustomers } from '@/app/actions/customers'
import { POSTerminal } from '@/components/pos/pos-terminal'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'POS Terminal' }

export default async function POSPage() {
  const [products, customers] = await Promise.all([
    getProducts(),
    getCustomers(),
  ])

  return (
    <div>
      <div className="page-header mb-4">
        <div>
          <h1 className="text-xl font-semibold">POS Terminal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process sales with cash, M-Pesa, or card
          </p>
        </div>
      </div>
      <POSTerminal products={products} customers={customers} />
    </div>
  )
}
