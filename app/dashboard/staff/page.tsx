import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { StaffManagementTable } from '@/components/staff/staff-management-table'
import { AddStaffDialog } from '@/components/staff/add-staff-dialog'
import { db } from '@/lib/db'
import { branch, branchMembership, employee, posPinCredential } from '@/lib/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/authorization'
import { ASSIGNABLE_ROLES, PermissionEnum, RoleEnum, canManageExistingRole, isStaffManagedRole } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)

  // Fetch all employees for this organization
  const allEmployees = await db
    .select({ employee, posPinSet: sql<boolean>`${posPinCredential.userId} is not null and ${posPinCredential.enabled} = true` })
    .from(employee)
    .leftJoin(posPinCredential, eq(posPinCredential.userId, employee.userId))
    .where(eq(employee.orgId, authorization.organizationId))
    .orderBy(employee.createdAt)
    .catch(() => [])
  const visibleUserIds = authorization.isOrganizationWide ? null : new Set((await db.select({ userId: branchMembership.userId }).from(branchMembership).where(inArray(branchMembership.branchId, authorization.branchIds))).map(({ userId }) => userId))
  const employees = allEmployees.filter(({ employee: record }) =>
    (authorization.isOrganizationWide || Boolean(record.userId && visibleUserIds?.has(record.userId))) &&
    (authorization.role !== RoleEnum.MANAGER || canManageExistingRole(RoleEnum.MANAGER, record.role as RoleEnum))
  )
  const branches = await db.select({ id: branch.id, name: branch.name }).from(branch).where(and(
    eq(branch.organizationId, authorization.organizationId),
    authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds),
  )).orderBy(branch.name)
  const assignableRoles = ASSIGNABLE_ROLES[authorization.role].filter(isStaffManagedRole)

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <DashboardPageHeading
          icon={Users}
          title="Staff Management"
          description="Manage employees, assign shifts, and track performance."
        />
        <AddStaffDialog branches={branches} assignableRoles={assignableRoles} />
      </div>

      {/* Staff List */}
      <section className="rounded-lg border bg-card p-6">
        <StaffManagementTable employees={employees.map(row => ({ ...row.employee, posPinSet: row.posPinSet }))} actorRole={authorization.role} assignableRoles={assignableRoles} />
      </section>
    </div>
  )
}
