import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branchMembership, employee, organizationMembership, posAuthSession, posTerminal, user } from '@/lib/db/schema'
import { AuthorizationContext, AuthorizationError, normalizeRole } from '@/lib/auth/authorization'
import { PermissionEnum, ROLE_PERMISSIONS, RoleEnum } from '@/lib/types/permissions'

export const POS_TERMINAL_COOKIE = 'pesaby_pos_terminal'
export const POS_AUTH_COOKIE = 'pesaby_pos_auth'
// Retains the identity of a deliberately locked POS session so that only the
// same cashier can unlock it with their PIN. It is httpOnly and short-lived.
export const POS_LOCKED_SESSION_COOKIE = 'pesaby_pos_locked_session'
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
export const posCookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 }

export async function getTerminal() {
  const token = (await cookies()).get(POS_TERMINAL_COOKIE)?.value
  if (!token) return null
  return (await db.select().from(posTerminal).where(and(eq(posTerminal.tokenHash, tokenHash(token)), eq(posTerminal.status, 'active'))).limit(1))[0] ?? null
}

export const getPosAuthorizationContext = cache(async (): Promise<(AuthorizationContext & { authMethod: 'pos_pin'; branchId: string; terminalId: string }) | null> => {
  const token = (await cookies()).get(POS_AUTH_COOKIE)?.value
  if (!token) return null
  const [record] = await db.select().from(posAuthSession).where(and(eq(posAuthSession.tokenHash, tokenHash(token)), eq(posAuthSession.status, 'active'), gt(posAuthSession.expiresAt, new Date()))).limit(1)
  if (!record) return null
  const [[account], [membership], [assigned], [staff]] = await Promise.all([
    db.select({ status: user.status }).from(user).where(eq(user.id, record.userId)).limit(1),
    db.select({ role: organizationMembership.role }).from(organizationMembership).where(and(eq(organizationMembership.organizationId, record.organizationId), eq(organizationMembership.userId, record.userId))).limit(1),
    db.select().from(branchMembership).where(and(eq(branchMembership.branchId, record.branchId), eq(branchMembership.userId, record.userId))).limit(1),
    db.select({ status: employee.status }).from(employee).where(and(eq(employee.orgId, record.organizationId), eq(employee.userId, record.userId))).limit(1),
  ])
  if (account?.status !== 'active' || staff?.status !== 'active' || !membership || !assigned) return null
  const role = normalizeRole(membership.role), permissions = ROLE_PERMISSIONS[role]
  if (!permissions.includes(PermissionEnum.POS_PIN_USE)) return null
  return { userId: record.userId, organizationId: record.organizationId, role, permissions, branchIds: [record.branchId], isOrganizationWide: false, authMethod: 'pos_pin', branchId: record.branchId, terminalId: record.terminalId }
})

export async function requirePointOfSaleAuthorization(permission: PermissionEnum) {
  const context = await getPosAuthorizationContext()
  if (!context || !context.permissions.includes(permission)) throw new AuthorizationError('POS is locked or access is not permitted')
  return context
}
