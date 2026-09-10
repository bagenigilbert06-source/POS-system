import { PermissionEnum, RoleEnum } from '../types/permissions'

export type LandingAuthorization = { role: RoleEnum; permissions: readonly PermissionEnum[] }

/** The only role/permission-to-landing map. It is pure for focused testing, but
 * callers must construct its input from trusted server authorization data. */
export function resolveUserLandingDestination({ role, permissions }: LandingAuthorization): string {
  if (role === RoleEnum.OWNER || role === RoleEnum.ADMIN || role === RoleEnum.STORE_MANAGER || role === RoleEnum.MANAGER) return '/dashboard'
  if (role === RoleEnum.SUPERVISOR && permissions.includes(PermissionEnum.SHIFT_MANAGE)) return '/dashboard/operations'
  if (role === RoleEnum.INVENTORY && permissions.includes(PermissionEnum.INVENTORY_VIEW)) return '/dashboard/inventory'
  if (role === RoleEnum.ACCOUNTANT && permissions.includes(PermissionEnum.FINANCE_VIEW)) return '/dashboard/financials'
  if (role === RoleEnum.CHEF && permissions.includes(PermissionEnum.KITCHEN_QUEUE_VIEW)) return '/dashboard/cafe/preparation'
  if (role === RoleEnum.CASHIER && permissions.includes(PermissionEnum.POS_VIEW)) return '/dashboard'
  if ([RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF].includes(role) && permissions.includes(PermissionEnum.POS_VIEW)) return '/dashboard/pos'
  // Safe fallback for legacy/custom role aliases follows actual authority.
  if (permissions.includes(PermissionEnum.POS_VIEW)) return '/dashboard/pos'
  if (permissions.includes(PermissionEnum.INVENTORY_VIEW)) return '/dashboard/inventory'
  if (permissions.includes(PermissionEnum.SHIFT_MANAGE)) return '/dashboard/operations'
  if (permissions.includes(PermissionEnum.FINANCE_VIEW)) return '/dashboard/financials'
  if (permissions.includes(PermissionEnum.ADMIN_ACCESS)) return '/dashboard'
  return '/restricted'
}
