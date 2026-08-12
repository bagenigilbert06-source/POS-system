import { cache } from 'react'
import { and, eq } from 'drizzle-orm'
import { getCurrentSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { branchMembership, organization, organizationMembership } from '@/lib/db/schema'
import { PermissionEnum, ROLE_PERMISSIONS, RoleEnum } from '@/lib/types/permissions'

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden') { super(message); this.name = 'AuthorizationError' }
}

const legacyRoleMap: Record<string, RoleEnum> = {
  owner: RoleEnum.OWNER, admin: RoleEnum.ADMIN, manager: RoleEnum.MANAGER, supervisor: RoleEnum.SUPERVISOR,
  cashier: RoleEnum.CASHIER, inventory: RoleEnum.INVENTORY, storekeeper: RoleEnum.INVENTORY,
  accountant: RoleEnum.ACCOUNTANT, finance: RoleEnum.ACCOUNTANT,
  staff: RoleEnum.STAFF, member: RoleEnum.STAFF, chef: RoleEnum.CHEF, pharmacist: RoleEnum.PHARMACIST,
  pharmacy_staff: RoleEnum.PHARMACY_STAFF,
}

export type AuthorizationContext = {
  userId: string; organizationId: string; role: RoleEnum; permissions: readonly PermissionEnum[]; branchIds: string[]; isOrganizationWide: boolean; authMethod?: 'password' | 'pos_pin'
}

export function normalizeRole(role: string): RoleEnum {
  return legacyRoleMap[role.toLowerCase()] ?? RoleEnum.STAFF
}

export const getAuthorizationContext = cache(async (): Promise<AuthorizationContext> => {
  const session = await getCurrentSession()
  if (!session?.user) throw new AuthorizationError('Unauthorized')
  const memberships = await db.select({ organizationId: organizationMembership.organizationId, role: organizationMembership.role })
    .from(organizationMembership).where(eq(organizationMembership.userId, session.user.id)).limit(2)
  const membership = memberships[0]
  if (!membership) {
    const [owned] = await db.select({ id: organization.id }).from(organization).where(eq(organization.userId, session.user.id)).limit(1)
    if (!owned) throw new AuthorizationError('No organization access')
    return { userId: session.user.id, organizationId: owned.id, role: RoleEnum.OWNER, permissions: ROLE_PERMISSIONS[RoleEnum.OWNER], branchIds: [], isOrganizationWide: true, authMethod: 'password' }
  }
  const role = normalizeRole(membership.role)
  const branches = await db.select({ branchId: branchMembership.branchId }).from(branchMembership)
    .where(eq(branchMembership.userId, session.user.id))
  const isOrganizationWide = role === RoleEnum.OWNER || role === RoleEnum.ADMIN
  const permissions = role === RoleEnum.ADMIN ? ROLE_PERMISSIONS[RoleEnum.OWNER] : ROLE_PERMISSIONS[role]
  return { userId: session.user.id, organizationId: membership.organizationId, role, permissions, branchIds: branches.map(({ branchId }) => branchId), isOrganizationWide, authMethod: 'password' }
})

export async function requireFullAuthentication() {
  const context = await getAuthorizationContext()
  if (context.authMethod !== 'password') throw new AuthorizationError('Full password authentication is required')
  return context
}

export function hasPermission(context: AuthorizationContext, permission: PermissionEnum | string) {
  return context.permissions.includes(permission as PermissionEnum)
}
export async function requirePermission(permission: PermissionEnum | string) {
  const context = await getAuthorizationContext()
  if (!hasPermission(context, permission)) throw new AuthorizationError(`Missing permission: ${permission}`)
  return context
}
export async function requireAnyPermission(permissions: readonly (PermissionEnum | string)[]) {
  const context = await getAuthorizationContext()
  if (!permissions.some((permission) => hasPermission(context, permission))) throw new AuthorizationError('Missing required permission')
  return context
}
export async function requireBranchAccess(branchId: string) {
  const context = await getAuthorizationContext()
  if (!context.isOrganizationWide && !context.branchIds.includes(branchId)) throw new AuthorizationError('No access to this branch')
  return context
}

/** The single post-authentication home decision. Route guards still enforce permissions. */
export function getDefaultWorkspaceRoute(context: AuthorizationContext) {
  switch (context.role) {
    case RoleEnum.CASHIER: return '/dashboard/pos'
    case RoleEnum.SUPERVISOR: return '/dashboard/operations'
    case RoleEnum.INVENTORY: return '/dashboard/inventory'
    case RoleEnum.ACCOUNTANT: return '/dashboard/financials'
    default: return '/dashboard'
  }
}
