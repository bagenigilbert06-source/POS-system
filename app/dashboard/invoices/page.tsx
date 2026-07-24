import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { FileText, Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { InvoicesTable } from '@/components/invoices/invoices-table'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { db } from '@/lib/db'
import { invoice } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  // Fetch all invoices for this organization
  const invoices = await db
    .select()
    .from(invoice)
    .where(eq(invoice.orgId, organization.id))
    .orderBy(invoice.createdAt)
    .catch(() => [])

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <DashboardPageHeading
          icon={FileText}
          title="Invoices"
          description="Create, manage, and track customer invoices."
        />
        <CreateInvoiceDialog />
      </div>

      {/* Invoices List */}
      <section className="rounded-lg border bg-card p-6">
        <InvoicesTable invoices={invoices} orgId={organization.id} />
      </section>
    </div>
  )
}
