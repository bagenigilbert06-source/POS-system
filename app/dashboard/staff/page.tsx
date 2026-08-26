import type { Metadata } from 'next'
import { StaffManagementTable } from '@/components/staff/staff-management-table'
import { db } from '@/lib/db'
import { branch, branchMembership, employee, organization, posPinCredential, user } from '@/lib/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/authorization'
import { ASSIGNABLE_ROLES, PermissionEnum, RoleEnum, canManageExistingRole, isStaffManagedRole } from '@/lib/types/permissions'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'

export const metadata: Metadata = { title: 'Employees' }

export default async function StaffPage() {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)

  // Fetch all employees for this organization
  const allEmployees = await db
    .select({ employee, image: user.image, posPinSet: sql<boolean>`${posPinCredential.userId} is not null and ${posPinCredential.enabled} = true`, newJoiner: sql<boolean>`${employee.joinDate} >= now() - interval '30 days'` })
    .from(employee)
    .leftJoin(user, eq(user.id, employee.userId))
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
  const [workspace] = await db.select({ businessType: organization.businessType, businessCategory: organization.businessCategory })
    .from(organization).where(eq(organization.id, authorization.organizationId)).limit(1)
  const pharmacyWorkspace = isPharmacyBusiness(workspace?.businessType, workspace?.businessCategory)
  const liquorWorkspace = workspace?.businessCategory === 'liquor_shop'
  const pharmacyRoles = new Set<RoleEnum>([RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF])
  const assignableRoles = ASSIGNABLE_ROLES[authorization.role]
    .filter(isStaffManagedRole)
    .filter((role) => pharmacyWorkspace || !pharmacyRoles.has(role))
  const description = pharmacyWorkspace
    ? 'Manage pharmacists, pharmacy assistants, cashiers and branch access.'
    : liquorWorkspace
      ? 'Manage attendants, cashiers, storekeepers and branch access.'
      : 'Manage your employees, roles and branch access.'

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-10">
      <StaffManagementTable
        branches={branches}
        description={description}
        employees={employees.map(row => ({ ...row.employee, image: row.image, posPinSet: row.posPinSet }))}
        actorRole={authorization.role}
        assignableRoles={assignableRoles}
        summary={{
          total: employees.length,
          active: employees.filter(({ employee: record }) => record.status === 'active').length,
          inactive: employees.filter(({ employee: record }) => record.status === 'inactive' || record.status === 'terminated').length,
          newJoiners: employees.filter(({ newJoiner }) => newJoiner).length,
        }}
      />
    </div>
  )
}
