import type { Metadata } from 'next'
import { Users, UserCheck, UserX, Mail } from 'lucide-react'
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
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <DashboardPageHeading
        icon={Users}
        title="Staff Management"
        description="Manage employees, assign shifts, and track performance."
        theme="adaptive"
        action={<AddStaffDialog branches={branches} assignableRoles={assignableRoles} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff summary">
        {[
          { label: 'Total staff', value: employees.length, icon: Users, tone: 'text-slate-600 dark:text-slate-300', iconBg: 'bg-slate-100 dark:bg-white/10' },
          { label: 'Active', value: employees.filter(({ employee: record }) => record.status === 'active').length, icon: UserCheck, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-400/10' },
          { label: 'Inactive', value: employees.filter(({ employee: record }) => record.status === 'inactive' || record.status === 'terminated').length, icon: UserX, tone: 'text-slate-500 dark:text-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-400/10' },
          { label: 'Pending invitations', value: employees.filter(({ employee: record }) => record.status === 'invited').length, icon: Mail, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-400/10' },
        ].map(({ label, value, icon: Icon, tone, iconBg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)] dark:bg-card dark:shadow-none">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}><Icon className={`h-[18px] w-[18px] ${tone}`} aria-hidden="true" /></span>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold leading-none tracking-tight text-foreground">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Staff List */}
      <section className="rounded-xl bg-card p-5 shadow-sm dark:shadow-none sm:p-6">
        <StaffManagementTable employees={employees.map(row => ({ ...row.employee, posPinSet: row.posPinSet }))} actorRole={authorization.role} assignableRoles={assignableRoles} />
      </section>
    </div>
  )
}
