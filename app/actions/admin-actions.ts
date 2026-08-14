'use server'

import { and, eq, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  auditEvent,
  branch,
  branchMembership,
  expense,
  inventoryBalance,
  inventoryLoss,
  mpesaBusinessAccount,
  posTerminal,
  posAuthSession,
  purchase,
  purchaseReceipt,
  sale,
  stockMovement,
  session,
  organizationMembership,
} from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { canManageExistingRole, RoleEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'

const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, dashes or underscores'),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(180).optional(),
  region: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(3).max(80).default('Africa/Nairobi'),
})

function refreshAdmin() {
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/branches')
  revalidatePath('/dashboard/settings')
}

export async function createBranch(input: z.input<typeof branchSchema>) {
  const authorization = await requirePermission(PermissionEnum.ADMIN_ACCESS)
  const data = branchSchema.parse(input)
  const code = data.code.toUpperCase()
  const [duplicate] = await db.select({ id: branch.id }).from(branch).where(and(
    eq(branch.organizationId, authorization.organizationId),
    eq(branch.code, code),
  )).limit(1)
  if (duplicate) throw new Error('That branch code is already in use')

  const id = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(branch).values({
      id,
      organizationId: authorization.organizationId,
      code,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      region: data.region || null,
      city: data.city || null,
      timezone: data.timezone,
      isMain: false,
    })
    await tx.insert(branchMembership).values({ id: generateId(), branchId: id, userId: authorization.userId, role: authorization.role })
    await tx.insert(auditEvent).values({
      id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: 'branch.created', metadata: { branchId: id, code, name: data.name },
    })
  })
  refreshAdmin()
  return { success: true, id }
}

export async function updateBranch(id: string, input: z.input<typeof branchSchema>) {
  const authorization = await requirePermission(PermissionEnum.ADMIN_ACCESS)
  const branchId = z.string().min(1).parse(id)
  const data = branchSchema.parse(input)
  const code = data.code.toUpperCase()
  const [updated] = await db.update(branch).set({
    code,
    name: data.name,
    phone: data.phone || null,
    address: data.address || null,
    region: data.region || null,
    city: data.city || null,
    timezone: data.timezone,
    updatedAt: new Date(),
  }).where(and(eq(branch.id, branchId), eq(branch.organizationId, authorization.organizationId))).returning({ id: branch.id })
  if (!updated) throw new Error('Branch not found')
  await db.insert(auditEvent).values({
    id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
    action: 'branch.updated', metadata: { branchId, code, name: data.name },
  })
  refreshAdmin()
  return { success: true }
}

export async function deleteEmptyBranch(id: string) {
  const authorization = await requirePermission(PermissionEnum.ADMIN_ACCESS)
  const branchId = z.string().min(1).parse(id)
  const [record] = await db.select({ id: branch.id, name: branch.name, isMain: branch.isMain }).from(branch).where(and(
    eq(branch.id, branchId), eq(branch.organizationId, authorization.organizationId),
  )).limit(1)
  if (!record) throw new Error('Branch not found')
  if (record.isMain) throw new Error('The main branch cannot be deleted')

  const checks = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(branchMembership).where(and(eq(branchMembership.branchId, branchId), ne(branchMembership.userId, authorization.userId))),
    db.select({ count: sql<number>`count(*)` }).from(sale).where(eq(sale.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(purchase).where(eq(purchase.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(purchaseReceipt).where(eq(purchaseReceipt.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(inventoryBalance).where(eq(inventoryBalance.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(stockMovement).where(eq(stockMovement.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(posTerminal).where(eq(posTerminal.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(mpesaBusinessAccount).where(eq(mpesaBusinessAccount.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(expense).where(eq(expense.branchId, branchId)),
    db.select({ count: sql<number>`count(*)` }).from(inventoryLoss).where(eq(inventoryLoss.branchId, branchId)),
  ])
  const labels = ['staff assignments', 'sales', 'purchases', 'receipts', 'inventory balances', 'stock movements', 'POS terminals', 'M-Pesa accounts', 'expenses', 'inventory losses']
  const usedBy = checks.map((rows, index) => Number(rows[0]?.count ?? 0) > 0 ? labels[index] : null).filter(Boolean)
  if (usedBy.length) throw new Error(`Move or archive this branch’s ${usedBy.join(', ')} before deleting it`)

  await db.transaction(async (tx) => {
    await tx.delete(branch).where(and(eq(branch.id, branchId), eq(branch.organizationId, authorization.organizationId)))
    await tx.insert(auditEvent).values({
      id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: 'branch.deleted', metadata: { branchId, name: record.name },
    })
  })
  refreshAdmin()
  return { success: true }
}

export async function revokeStaffSessions(targetUserId: string) {
  const authorization = await requirePermission(PermissionEnum.ADMIN_ACCESS)
  const userId = z.string().min(1).parse(targetUserId)
  if (userId === authorization.userId) throw new Error('Use sign out to end your own current session')
  const [target] = await db.select({ role: organizationMembership.role }).from(organizationMembership).where(and(
    eq(organizationMembership.organizationId, authorization.organizationId),
    eq(organizationMembership.userId, userId),
  )).limit(1)
  if (!target || !canManageExistingRole(authorization.role, target.role as RoleEnum)) throw new Error('You cannot revoke sessions for this role')
  const browserSessions = await db.delete(session).where(eq(session.userId, userId)).returning({ id: session.id })
  const posSessions = await db.update(posAuthSession).set({ status: 'revoked' }).where(and(
    eq(posAuthSession.organizationId, authorization.organizationId), eq(posAuthSession.userId, userId), eq(posAuthSession.status, 'active'),
  )).returning({ id: posAuthSession.id })
  await db.insert(auditEvent).values({
    id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
    action: 'security.sessions_revoked', metadata: { targetUserId: userId, browserSessions: browserSessions.length, posSessions: posSessions.length },
  })
  revalidatePath('/dashboard/admin/security')
  return { success: true }
}
