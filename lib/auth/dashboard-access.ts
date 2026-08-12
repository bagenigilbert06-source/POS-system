import { redirect } from 'next/navigation'
import { getAuthorizationContext, hasPermission } from './authorization'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'

/** Server route guard. Cashiers are returned to their POS instead of seeing a BOS error page. */
export async function requireDashboardPermission(permission: PermissionEnum) {
  const context = await getAuthorizationContext()
  if (!hasPermission(context, permission)) {
    if (context.role === RoleEnum.CASHIER) redirect('/dashboard/pos')
    redirect('/restricted')
  }
  return context
}
