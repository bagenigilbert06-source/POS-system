import { getCustomers } from '@/app/actions/customers'
import { CustomersClient } from '@/components/customers/customers-client'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage your customer relationships</p>
          </div>
        </div>
      </div>

      <CustomersClient initialCustomers={customers} />
    </div>
  )
}
