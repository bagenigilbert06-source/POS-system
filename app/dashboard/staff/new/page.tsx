import type { Metadata } from 'next'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, organization, shift } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import {
  ASSIGNABLE_ROLES,
  PermissionEnum,
  RoleEnum,
  canAssignRole,
  isStaffManagedRole,
} from '@/lib/types/permissions'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { AddEmployeeForm } from '@/components/staff/add-employee-form'

export const metadata: Metadata = { title: 'Add Employee' }

export default async function AddEmployeePage() {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const [branches, shifts, workspace] = await Promise.all([
    db.select({ id: branch.id, name: branch.name }).from(branch).where(and(
      eq(branch.organizationId, authorization.organizationId),
      authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds),
    )).orderBy(branch.name),
    db.select({ id: shift.id, name: shift.name, startTime: shift.startTime, endTime: shift.endTime }).from(shift).where(eq(shift.orgId, authorization.organizationId)).orderBy(shift.name),
    db.select({ businessType: organization.businessType, businessCategory: organization.businessCategory }).from(organization).where(eq(organization.id, authorization.organizationId)).limit(1).then((rows) => rows[0]),
  ])
  const pharmacyWorkspace = isPharmacyBusiness(workspace?.businessType, workspace?.businessCategory)
  const pharmacyRoles = new Set<RoleEnum>([RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF])
  const roles = ASSIGNABLE_ROLES[authorization.role]
    .filter(isStaffManagedRole)
    .filter((role) => canAssignRole(authorization.role, role))
    .filter((role) => pharmacyWorkspace || !pharmacyRoles.has(role))

  return <AddEmployeeForm branches={branches} shifts={shifts} assignableRoles={roles} />
}
