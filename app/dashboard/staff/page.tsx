import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { StaffManagementTable } from '@/components/staff/staff-management-table'
import { AddStaffDialog } from '@/components/staff/add-staff-dialog'
import { db } from '@/lib/db'
import { branch, employee, posPinCredential } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)

  // Fetch all employees for this organization
  const employees = await db
    .select({ employee, posPinSet: sql<boolean>`${posPinCredential.userId} is not null and ${posPinCredential.enabled} = true` })
    .from(employee)
    .leftJoin(posPinCredential, eq(posPinCredential.userId, employee.userId))
    .where(eq(employee.orgId, authorization.organizationId))
    .orderBy(employee.createdAt)
    .catch(() => [])
  const branches = await db.select({ id: branch.id, name: branch.name }).from(branch).where(eq(branch.organizationId, authorization.organizationId)).orderBy(branch.name)

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <DashboardPageHeading
          icon={Users}
          title="Staff Management"
          description="Manage employees, assign shifts, and track performance."
        />
        <AddStaffDialog branches={branches} canCreateAdmin={authorization.role === 'owner'} />
      </div>

      {/* Staff List */}
      <section className="rounded-lg border bg-card p-6">
        <StaffManagementTable employees={employees.map(row => ({ ...row.employee, posPinSet: row.posPinSet }))} orgId={authorization.organizationId} />
      </section>
    </div>
  )
}
