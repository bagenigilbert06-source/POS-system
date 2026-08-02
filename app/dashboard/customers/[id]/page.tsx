import { getCustomerById } from '@/app/actions/customers'
import { CustomerForm } from '@/components/customers/customer-form'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Edit customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireWorkspaceModule('customers')
  const { id } = await params
  const item = await getCustomerById(id)
  if (!item) notFound()
  return <div className="mx-auto max-w-[1480px] space-y-6 py-2">
    <div className="mx-auto w-full max-w-3xl"><Link href="/dashboard/customers" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Customers</Link><h1 className="mt-4 text-2xl font-bold tracking-tight">Edit customer</h1><p className="mt-1 text-sm text-muted-foreground">Update {item.name}&apos;s details for faster checkout.</p></div>
    <CustomerForm customer={item} />
  </div>
}
