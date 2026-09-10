import { and, desc, eq, inArray } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { branch, branchMembership, employee, shift, shiftAssignment, user } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { ASSIGNABLE_ROLES, PermissionEnum, RoleEnum, canManageExistingRole, isStaffManagedRole } from '@/lib/types/permissions'
import { EditEmployeeForm } from '@/components/staff/edit-employee-form'

export default async function EditEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const [record] = await db.select({ employee, image: user.image }).from(employee).leftJoin(user, eq(user.id, employee.userId)).where(and(eq(employee.id, employeeId), eq(employee.orgId, authorization.organizationId))).limit(1)
  if (!record || !canManageExistingRole(authorization.role, record.employee.role as RoleEnum)) notFound()
  if (!authorization.isOrganizationWide) {
    if (!record.employee.userId) notFound()
    const employeeBranches = await db.select({ branchId: branchMembership.branchId }).from(branchMembership).innerJoin(branch, eq(branch.id, branchMembership.branchId)).where(and(eq(branchMembership.userId, record.employee.userId), eq(branch.organizationId, authorization.organizationId)))
    if (!employeeBranches.length || employeeBranches.some(({ branchId }) => !authorization.branchIds.includes(branchId))) notFound()
  }
  const [branches, shifts, memberships, assignments] = await Promise.all([
    db.select({ id: branch.id, name: branch.name }).from(branch).where(and(eq(branch.organizationId, authorization.organizationId), authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds))).orderBy(branch.name),
    db.select({ id: shift.id, name: shift.name, startTime: shift.startTime, endTime: shift.endTime }).from(shift).where(eq(shift.orgId, authorization.organizationId)).orderBy(shift.name),
    record.employee.userId ? db.select({ branchId: branchMembership.branchId }).from(branchMembership).where(eq(branchMembership.userId, record.employee.userId)) : [],
    db.select({ shiftId: shiftAssignment.shiftId }).from(shiftAssignment).where(and(eq(shiftAssignment.employeeId, employeeId), eq(shiftAssignment.orgId, authorization.organizationId))).orderBy(desc(shiftAssignment.createdAt)).limit(1),
  ])
  const roles = ASSIGNABLE_ROLES[authorization.role].filter(isStaffManagedRole)
  return <EditEmployeeForm employee={{ ...record.employee, image: record.image }} branches={branches} shifts={shifts} assignableRoles={roles} branchId={memberships[0]?.branchId ?? branches[0]?.id ?? ''} shiftId={assignments[0]?.shiftId ?? ''} />
}
