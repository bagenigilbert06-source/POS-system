import { redirect } from 'next/navigation';
import {
  AuthorizationError,
  getAuthorizationContext,
  hasPermission,
} from './authorization';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions';

/**
 * Authentication for the small set of dashboard pages deliberately available
 * from a registered POS terminal. POS PIN sessions carry a server-verified
 * cashier identity and scoped permissions; all other dashboard routes still
 * enforce their own permission requirements.
 */
const POS_WORKSPACE_PERMISSIONS = new Set<PermissionEnum>([
  PermissionEnum.ATTENDANCE_USE,
  PermissionEnum.CUSTOMER_VIEW,
  PermissionEnum.CUSTOMER_CREATE,
  PermissionEnum.POS_VIEW,
  PermissionEnum.POS_SELL,
  PermissionEnum.SALE_CREATE,
  PermissionEnum.SALE_VIEW,
  PermissionEnum.SALES_VIEW_OWN,
]);

export async function getDashboardAuthorization() {
  try {
    // A full dashboard sign-in always takes precedence over a terminal PIN.
    return await getAuthorizationContext();
  } catch (error) {
    if (
      !(error instanceof AuthorizationError) ||
      error.message !== 'Unauthorized'
    ) {
      throw error;
    }
    const pos = await getPosAuthorizationContext();
    // An expired or missing Better Auth session is an expected browser state,
    // not a server-rendering error. Redirect before any dashboard page tries
    // to resolve data with an unauthenticated identity.
    if (!pos) redirect('/sign-in');
    return pos;
  }
}

/** Server route guard. Cashiers are returned to their POS instead of seeing a BOS error page. */
export async function requireDashboardPermission(permission: PermissionEnum) {
  const context = await getDashboardAuthorization();
  if (
    context.authMethod === 'pos_pin' &&
    !POS_WORKSPACE_PERMISSIONS.has(permission)
  ) {
    redirect('/dashboard/pos');
  }
  if (!hasPermission(context, permission)) {
    if (context.role === RoleEnum.CASHIER) redirect('/dashboard/pos');
    redirect('/restricted');
  }
  return context;
}

export async function requireDashboardAnyPermission(
  permissions: readonly PermissionEnum[]
) {
  const context = await getDashboardAuthorization();
  if (
    context.authMethod === 'pos_pin' &&
    !permissions.some((permission) => POS_WORKSPACE_PERMISSIONS.has(permission))
  ) {
    redirect('/dashboard/pos');
  }
  if (!permissions.some((permission) => hasPermission(context, permission))) {
    if (context.role === RoleEnum.CASHIER) redirect('/dashboard/pos');
    redirect('/restricted');
  }
  return context;
}
