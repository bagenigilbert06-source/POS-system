'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auditEvent, branch, cashMovement, inventoryLoss, posSession, product, sale, saleItem, salesReturn, salesReturnItem } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { getAuthorizationContext, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { applyInventoryMovement } from '@/lib/inventory/inventory-service'

async function posOperator(permission: PermissionEnum) { const pos = await getPosAuthorizationContext(); if (pos) { if (!pos.permissions.includes(permission)) throw new Error('Permission denied'); return { userId: pos.userId, orgId: pos.organizationId, permissions: pos.permissions, branchIds: [pos.branchId], isOrganizationWide: false } } const full = await requirePermission(permission); return { userId: full.userId, orgId: full.organizationId, permissions: full.permissions, branchIds: full.branchIds, isOrganizationWide: full.isOrganizationWide } }
const refresh = () => ['/dashboard','/dashboard/pos','/dashboard/pos/history','/dashboard/operations','/dashboard/inventory','/dashboard/sales','/dashboard/reports'].forEach((path) => revalidatePath(path))

function localDateParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((value) => value.type === type)?.value ?? 0)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') }
}

function zonedMidnight(year: number, month: number, day: number, timeZone: string) {
  const desired = Date.UTC(year, month - 1, day)
  let candidate = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localDateParts(new Date(candidate), timeZone)
    candidate += desired - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
  }
  return new Date(candidate)
}

export async function getOperationsData(timeZone = 'Africa/Nairobi') {
  const authorization = await requirePermission(PermissionEnum.SHIFT_MANAGE)
  const orgId = authorization.organizationId
  let safeTimeZone = timeZone
  try { new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format() } catch { safeTimeZone = 'Africa/Nairobi' }
  const currentDate = localDateParts(new Date(), safeTimeZone)
  const nextDate = new Date(Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day + 1))
  const today = zonedMidnight(currentDate.year, currentDate.month, currentDate.day, safeTimeZone)
  const tomorrow = zonedMidnight(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate(), safeTimeZone)

  const sessionBranchScope = authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(posSession.branchId, authorization.branchIds) : sql`false`
  const saleBranchScope = authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
  const lossBranchScope = authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(inventoryLoss.branchId, authorization.branchIds) : sql`false`
  const scopedSaleIds = db.select({ id: sale.id }).from(sale).where(and(eq(sale.orgId, orgId), saleBranchScope))
  const [sessions, openSessions, returns, losses, products, sales, [salesToday], [refundsToday], [lossesToday]] = await Promise.all([
    db.select().from(posSession).where(and(eq(posSession.orgId, orgId), sessionBranchScope)).orderBy(desc(posSession.openedAt)).limit(30),
    db.select().from(posSession).where(and(eq(posSession.orgId, orgId), sessionBranchScope, eq(posSession.status, 'open'))).orderBy(desc(posSession.openedAt)).limit(100),
    db.select().from(salesReturn).where(and(eq(salesReturn.orgId, orgId), authorization.isOrganizationWide ? undefined : inArray(salesReturn.saleId, scopedSaleIds))).orderBy(desc(salesReturn.createdAt)).limit(50),
    db.select().from(inventoryLoss).where(and(eq(inventoryLoss.orgId, orgId), lossBranchScope)).orderBy(desc(inventoryLoss.createdAt)).limit(50),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(product.name),
    db.select().from(sale).where(and(eq(sale.orgId, orgId), saleBranchScope, eq(sale.status, 'completed'))).orderBy(desc(sale.createdAt)).limit(100),
    db.select({ total: sql<string>`coalesce(sum(${sale.total}), 0)`, count: sql<number>`count(*)` }).from(sale).where(and(eq(sale.orgId, orgId), saleBranchScope, eq(sale.status, 'completed'), gte(sale.createdAt, today), lt(sale.createdAt, tomorrow))),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`, count: sql<number>`count(*)` }).from(salesReturn).where(and(eq(salesReturn.orgId, orgId), authorization.isOrganizationWide ? undefined : inArray(salesReturn.saleId, scopedSaleIds), eq(salesReturn.status, 'completed'), gte(salesReturn.createdAt, today), lt(salesReturn.createdAt, tomorrow))),
    db.select({ totalCost: sql<string>`coalesce(sum(${inventoryLoss.totalCost}), 0)`, quantity: sql<number>`coalesce(sum(${inventoryLoss.quantity}), 0)`, count: sql<number>`count(*)` }).from(inventoryLoss).where(and(eq(inventoryLoss.orgId, orgId), lossBranchScope, gte(inventoryLoss.createdAt, today), lt(inventoryLoss.createdAt, tomorrow))),
  ])
  return { sessions, openSessions, returns, losses, products, sales, summary: { salesToday, refundsToday, lossesToday } }
}

/** Cashier-safe data: no organization-wide sales, financials, or other users' shifts. */
export async function getCashierWorkspace() {
  const pos = await getPosAuthorizationContext(), authorization = pos ?? await requirePermission(PermissionEnum.POS_VIEW)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [[session], [summary], [refundSummary], recentSales] = await Promise.all([
    db.select().from(posSession).where(and(eq(posSession.orgId, authorization.organizationId), eq(posSession.openedBy, authorization.userId), eq(posSession.status, 'open'))).orderBy(desc(posSession.openedAt)).limit(1),
    db.select({ total: sql<string>`coalesce(sum(${sale.total}),0)`, count: sql<number>`count(*)` }).from(sale).where(and(eq(sale.orgId, authorization.organizationId), eq(sale.userId, authorization.userId), inArray(sale.status, ['completed', 'partially_refunded', 'refunded']), gte(sale.createdAt, today))),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}),0)` }).from(salesReturn).where(and(eq(salesReturn.orgId, authorization.organizationId), eq(salesReturn.userId, authorization.userId), eq(salesReturn.status, 'completed'), gte(salesReturn.createdAt, today))),
    db.select({ id: sale.id, receiptNo: sale.receiptNo, total: sale.total, createdAt: sale.createdAt }).from(sale).where(and(eq(sale.orgId, authorization.organizationId), eq(sale.userId, authorization.userId))).orderBy(desc(sale.createdAt)).limit(5),
  ])
  return { session: session ?? null, todaySales: Number(summary.total) - Number(refundSummary.total), transactionCount: Number(summary.count), recentSales }
}

export async function recordInventoryLoss(input: { productId: string; quantity: number; type: string; reason: string }) {
  const data = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive(), type: z.enum(['damaged','expired','lost','theft','count_adjustment']), reason: z.string().trim().min(3).max(300) }).parse(input)
  const authorization = await requirePermission(PermissionEnum.INVENTORY_ADJUST)
  const { userId, organizationId: orgId } = authorization
  await db.transaction(async (tx) => {
    const [item] = await tx.select().from(product).where(and(eq(product.id, data.productId), eq(product.orgId, orgId))).limit(1)
    const [location] = await tx.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), authorization.isOrganizationWide ? undefined : eq(branch.id, authorization.branchIds[0] ?? ''))).orderBy(desc(branch.isMain), branch.createdAt).limit(1)
    if (!item || !location) throw new Error('Product or inventory location not found')
    const id = generateId(), lossNo = `LOSS-${Date.now().toString().slice(-8)}`
    await tx.insert(inventoryLoss).values({ id, lossNo, productId: item.id, productName: item.name, quantity: data.quantity, type: data.type, unitCost: item.buyingPrice, totalCost: String(Number(item.buyingPrice) * data.quantity), reason: data.reason, userId, orgId, branchId: location.id })
    await applyInventoryMovement(tx, { productId: item.id, productName: item.name, branchId: location.id, quantity: -data.quantity, type: `loss_${data.type}`, referenceType: 'inventory_loss', referenceId: id, reason: data.reason, userId, orgId, unitCost: Number(item.buyingPrice) })
  })
  await invalidateProductReadCache(orgId); refresh()
}

export async function refundSale(input: { saleId: string; refundMethod: string; reason: string; disposition: string }) {
  const data = z.object({ saleId: z.string().min(1), refundMethod: z.enum(['cash','mpesa','card','store_credit']), reason: z.string().trim().min(3).max(300), disposition: z.enum(['restock','damaged']) }).parse(input)
  const authorization = await requirePermission(PermissionEnum.SALE_REFUND)
  const { userId, organizationId: orgId } = authorization
  await db.transaction(async (tx) => {
    const [[record], prior, items] = await Promise.all([tx.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1), tx.select().from(salesReturn).where(and(eq(salesReturn.saleId, data.saleId), eq(salesReturn.orgId, orgId))).limit(1), tx.select().from(saleItem).where(and(eq(saleItem.saleId, data.saleId), eq(saleItem.orgId, orgId)))])
    if (!record?.branchId) throw new Error('Sale or inventory location not found')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(record.branchId)) throw new Error('This sale is outside your assigned branches')
    if (prior.length) throw new Error('This sale has already been refunded')
    const returnId = generateId(), returnNo = `CN-${Date.now().toString().slice(-8)}`
    await tx.insert(salesReturn).values({ id: returnId, returnNo, saleId: record.id, receiptNo: record.receiptNo, amount: record.total, refundMethod: data.refundMethod, reason: data.reason, userId, orgId })
    for (const line of items) {
      await tx.insert(salesReturnItem).values({ id: generateId(), returnId, productId: line.productId, productName: line.productName, quantity: line.quantity, unitPrice: line.unitPrice, total: line.totalPrice, disposition: data.disposition, orgId })
      if (data.disposition === 'restock') await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: record.branchId, quantity: line.quantity, type: 'sales_return', referenceType: 'credit_note', referenceId: returnId, reason: returnNo, userId, orgId })
    }
    await tx.update(sale).set({ status: 'refunded' }).where(and(eq(sale.id, record.id), eq(sale.orgId, orgId)))
  })
  await invalidateProductReadCache(orgId); refresh()
}

export async function openPosSession(openingCash: number) {
  const amount = z.coerce.number().nonnegative().max(999999999).parse(openingCash)
  const authorization = await posOperator(PermissionEnum.SHIFT_OPEN)
  const { userId, orgId } = authorization
  let branchId = authorization.branchIds[0]
  if (!branchId && authorization.isOrganizationWide) {
    const [mainBranch] = await db.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, orgId)).orderBy(desc(branch.isMain), branch.createdAt).limit(1)
    branchId = mainBranch?.id
  }
  if (!branchId) throw new Error('No assigned branch is available')
  const [existing] = await db.select().from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.status, 'open'), eq(posSession.openedBy, userId))).limit(1)
  if (existing) throw new Error('Close your current register first')
  try {
    await db.insert(posSession).values({ id: generateId(), sessionNo: `REG-${Date.now().toString().slice(-8)}`, openingCash: String(amount), openedBy: userId, orgId, branchId })
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } }
    if (databaseError.code === '23505' || databaseError.cause?.code === '23505') throw new Error('This cashier already has an open register')
    throw error
  }
  refresh()
}

export async function closePosSession(closingCash: number, notes = '', sessionId?: string) {
  const counted = z.coerce.number().nonnegative().max(999999999).parse(closingCash)
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE)
  const { userId, orgId } = authorization
  const selectedSessionId = sessionId ? z.string().min(1).parse(sessionId) : undefined
  const canManage = authorization.permissions.includes(PermissionEnum.SHIFT_MANAGE)
  const [current] = await db.select().from(posSession).where(and(
    eq(posSession.orgId, orgId),
    eq(posSession.status, 'open'),
    authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(posSession.branchId, authorization.branchIds) : sql`false`,
    canManage ? (selectedSessionId ? eq(posSession.id, selectedSessionId) : undefined) : eq(posSession.openedBy, userId),
  )).orderBy(desc(posSession.openedAt)).limit(1)
  if (!current) throw new Error('No open register')

  // A supervisor may reconcile any open register. Keep the expected cash tied
  // to the operator who opened the selected register, never all organization sales.
  const [[cashSales], [cashRefunds], [moves]] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${sale.total}),0)` }).from(sale).where(and(
      eq(sale.orgId, orgId),
      eq(sale.userId, current.openedBy),
      inArray(sale.status, ['completed', 'partially_refunded', 'refunded']),
      eq(sale.paymentMethod, 'cash'),
      gte(sale.createdAt, current.openedAt),
    )),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}),0)` })
      .from(salesReturn)
      .innerJoin(sale, eq(salesReturn.saleId, sale.id))
      .where(and(
        eq(salesReturn.orgId, orgId),
        eq(sale.userId, current.openedBy),
        eq(salesReturn.status, 'completed'),
        eq(salesReturn.refundMethod, 'cash'),
        gte(salesReturn.createdAt, current.openedAt),
      )),
    db.select({ total: sql<string>`coalesce(sum(case when ${cashMovement.type}='cash_in' then ${cashMovement.amount} else -${cashMovement.amount} end),0)` })
      .from(cashMovement)
      .where(eq(cashMovement.sessionId, current.id)),
  ])
  const expected = Number(current.openingCash) + Number(cashSales.total) - Number(cashRefunds.total) + Number(moves.total)
  const variance = counted - expected
  const [closed] = await db.update(posSession).set({
    status: 'closed',
    expectedCash: String(expected),
    closingCash: String(counted),
    variance: String(variance),
    notes: notes || null,
    closedBy: userId,
    closedAt: new Date(),
  }).where(and(eq(posSession.id, current.id), eq(posSession.orgId, orgId), eq(posSession.status, 'open'))).returning({ id: posSession.id })
  if (!closed) throw new Error('This register has already been closed')
  await db.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'shift.reconciled', metadata: { sessionId: current.id, expectedCash: expected, countedCash: counted, variance, cashRefunds: Number(cashRefunds.total) } })
  refresh()
  return { expectedCash: expected, countedCash: counted, variance }
}
