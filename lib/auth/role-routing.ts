import { RoleEnum } from '../types/permissions'

/** Stable post-login landing page for every operational role. Workspace
 * configuration then supplies pharmacy or retail labels and data. */
export function defaultWorkspaceRouteForRole(role: RoleEnum) {
  switch (role) {
    case RoleEnum.CASHIER:
    case RoleEnum.PHARMACIST:
    case RoleEnum.PHARMACY_STAFF:
      return '/dashboard/pos'
    case RoleEnum.SUPERVISOR:
      return '/dashboard/operations'
    case RoleEnum.INVENTORY:
      return '/dashboard/inventory'
    case RoleEnum.ACCOUNTANT:
      return '/dashboard/financials'
    case RoleEnum.STAFF:
    case RoleEnum.CHEF:
      return '/restricted'
    default:
      return '/dashboard'
  }
}
