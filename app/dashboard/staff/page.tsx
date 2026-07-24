import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Users, Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { StaffManagementTable } from '@/components/staff/staff-management-table'
import { AddStaffDialog } from '@/components/staff/add-staff-dialog'
import { db } from '@/lib/db'
import { employee } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  // Fetch all employees for this organization
  const employees = await db
    .select()
    .from(employee)
    .where(eq(employee.orgId, organization.id))
    .orderBy(employee.createdAt)
    .catch(() => [])

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <DashboardPageHeading
          icon={Users}
          title="Staff Management"
          description="Manage employees, assign shifts, and track performance."
        />
        <AddStaffDialog />
      </div>

      {/* Staff List */}
      <section className="rounded-lg border bg-card p-6">
        <StaffManagementTable employees={employees} orgId={organization.id} />
      </section>
    </div>
  )
}
