import { NextResponse } from 'next/server'
import { AuthorizationError, getAuthorizationContext } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'

export async function GET() {
  try {
    const posContext = await getPosAuthorizationContext()
    const context = posContext ?? await getAuthorizationContext()
    const permissions = posContext
      ? context.permissions.filter((permission) => [
          PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_DISCOUNT, PermissionEnum.POS_HOLD,
          PermissionEnum.POS_PIN_USE, PermissionEnum.SALE_VIEW, PermissionEnum.SALES_VIEW_OWN,
          PermissionEnum.SALE_REFUND, PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE,
        ].includes(permission))
      : context.permissions
    return NextResponse.json({ role: context.role, permissions, organizationId: context.organizationId, branchIds: context.branchIds, authMethod: posContext ? 'pos_pin' : 'password' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : 'Unauthorized' }, { status: 401 })
  }
}
