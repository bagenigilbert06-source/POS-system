import { getCustomers } from '@/app/actions/customers'
import { CustomersClient } from '@/components/customers/customers-client'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage() {
  await requireWorkspaceModule('customers')
  const customers = await getCustomers()

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading icon={Users} title="Customers" description="Keep customer details and activity connected to daily sales." />

      <CustomersClient initialCustomers={customers} />
    </div>
  )
}
