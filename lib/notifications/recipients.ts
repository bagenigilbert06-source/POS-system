import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branchMembership, employee, notificationPreference, organization, organizationMembership, user } from '@/lib/db/schema'

export type NotificationType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DAILY_BUSINESS_DIGEST'
export type Recipient = { userId: string; email: string; name: string | null; role: string }

const defaults: Record<NotificationType, readonly string[]> = {
  LOW_STOCK: ['inventory', 'store_manager'],
  OUT_OF_STOCK: ['inventory', 'store_manager', 'owner', 'admin'],
  DAILY_BUSINESS_DIGEST: ['owner', 'admin', 'store_manager'],
}

function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }
export function resolvePreference(branchValue: boolean | undefined, organizationValue: boolean | undefined, systemDefault: boolean) { return branchValue ?? organizationValue ?? systemDefault }

export async function notificationEnabled(organizationId: string, branchId: string | null, role: string, type: NotificationType) {
  if (branchId) {
    const [specific] = await db.select({ enabled: notificationPreference.enabled }).from(notificationPreference).where(and(eq(notificationPreference.organizationId, organizationId), eq(notificationPreference.branchId, branchId), eq(notificationPreference.role, role), eq(notificationPreference.type, type))).limit(1)
    if (specific) return resolvePreference(specific.enabled, undefined, defaults[type].includes(role))
  }
  const [organizationSetting] = await db.select({ enabled: notificationPreference.enabled }).from(notificationPreference).where(and(eq(notificationPreference.organizationId, organizationId), isNull(notificationPreference.branchId), eq(notificationPreference.role, role), eq(notificationPreference.type, type))).limit(1)
  return resolvePreference(undefined, organizationSetting?.enabled, defaults[type].includes(role))
}

export function defaultRolesForNotification(type: NotificationType) { return defaults[type] }

/** Resolves only present, active access; historical rows are never recipients. */
export async function resolveNotificationRecipients(input: { organizationId: string; branchId: string | null; type: NotificationType }) {
  const allowed = input.type === 'DAILY_BUSINESS_DIGEST'
    ? (input.branchId ? ['store_manager'] : ['owner', 'admin'])
    : defaults[input.type]
  const rows = await db.select({ userId: user.id, email: user.email, name: user.name, membershipRole: organizationMembership.role, employeeRole: employee.role, employeeStatus: employee.status })
    .from(organizationMembership).innerJoin(user, eq(user.id, organizationMembership.userId))
    .leftJoin(employee, and(eq(employee.userId, user.id), eq(employee.orgId, input.organizationId)))
    .where(and(eq(organizationMembership.organizationId, input.organizationId), eq(user.status, 'active')))
  const owners = await db.select({ userId: user.id, email: user.email, name: user.name }).from(organization).innerJoin(user, eq(user.id, organization.userId))
    .where(and(eq(organization.id, input.organizationId), eq(user.status, 'active')))
  const result = new Map<string, Recipient>()
  for (const row of rows) {
    const role = row.membershipRole === 'member' ? row.employeeRole : row.membershipRole
    if (!role || !allowed.includes(role) || (role !== 'owner' && row.employeeStatus !== 'active') || !validEmail(row.email)) continue
    if (input.branchId && ['inventory', 'store_manager'].includes(role)) {
      const membership = await db.select({ id: branchMembership.id }).from(branchMembership).where(and(eq(branchMembership.userId, row.userId), eq(branchMembership.branchId, input.branchId))).limit(1)
      if (!membership[0]) continue
    }
    if (await notificationEnabled(input.organizationId, input.branchId, role, input.type)) result.set(row.email.trim().toLowerCase(), { userId: row.userId, email: row.email, name: row.name, role })
  }
  if (allowed.includes('owner')) for (const owner of owners) if (validEmail(owner.email) && await notificationEnabled(input.organizationId, null, 'owner', input.type)) result.set(owner.email.trim().toLowerCase(), { ...owner, role: 'owner' })
  return [...result.values()]
}
