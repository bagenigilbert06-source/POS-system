'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { notificationPreference, organization } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'

const inputSchema = z.object({ lowStock: z.boolean(), outOfStock: z.boolean(), dailyDigest: z.boolean(), digestTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })
const roles = { LOW_STOCK: ['inventory', 'store_manager'], OUT_OF_STOCK: ['inventory', 'store_manager', 'owner', 'admin'], DAILY_BUSINESS_DIGEST: ['owner', 'admin', 'store_manager'] } as const

export async function getNotificationSettings() {
  const auth = await requirePermission(PermissionEnum.SETTINGS_VIEW)
  const [org] = await db.select({ timezone: organization.timezone }).from(organization).where(eq(organization.id, auth.organizationId)).limit(1)
  const rows = await db.select().from(notificationPreference).where(and(eq(notificationPreference.organizationId, auth.organizationId), isNull(notificationPreference.branchId)))
  const enabled = (type: string) => rows.filter((row) => row.type === type).every((row) => row.enabled)
  return { lowStock: enabled('LOW_STOCK'), outOfStock: enabled('OUT_OF_STOCK'), dailyDigest: enabled('DAILY_BUSINESS_DIGEST'), digestTime: rows.find((row) => row.type === 'DAILY_BUSINESS_DIGEST')?.digestTime ?? '20:00', timezone: org?.timezone ?? 'Africa/Nairobi' }
}

export async function saveNotificationSettings(input: z.input<typeof inputSchema>) {
  const data = inputSchema.parse(input), auth = await requirePermission(PermissionEnum.SETTINGS_EDIT)
  const values = Object.entries(roles).flatMap(([type, typeRoles]) => typeRoles.map((role) => ({ id: generateId(), organizationId: auth.organizationId, role, type, enabled: type === 'LOW_STOCK' ? data.lowStock : type === 'OUT_OF_STOCK' ? data.outOfStock : data.dailyDigest, digestTime: data.digestTime })))
  await db.transaction(async (tx) => { for (const value of values) await tx.insert(notificationPreference).values(value).onConflictDoUpdate({ target: [notificationPreference.organizationId, notificationPreference.role, notificationPreference.type], targetWhere: isNull(notificationPreference.branchId), set: { enabled: value.enabled, digestTime: value.digestTime, updatedAt: new Date() } }) })
  revalidatePath('/dashboard/admin/notifications')
  return { success: true }
}
