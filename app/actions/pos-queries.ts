'use server'

import { db } from '@/lib/db'
import { sale, saleItem } from '@/lib/db/schema'
import { and, desc, eq, gte, inArray, like, lte } from 'drizzle-orm'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

async function receiptContext() {
  const authorization = await getPosAuthorizationContext() ?? await requireAnyPermission([
    PermissionEnum.SALES_VIEW_OWN,
    PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.SALE_VIEW,
  ])
  return {
    orgId: authorization.organizationId,
    userId: authorization.userId,
    viewAll: authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL),
  }
}

async function withItems(records: (typeof sale.$inferSelect)[], orgId: string) {
  if (records.length === 0) return []
  const items = await db.select().from(saleItem).where(and(
    eq(saleItem.orgId, orgId),
    inArray(saleItem.saleId, records.map((record) => record.id)),
  ))
  const itemsBySale = new Map<string, (typeof saleItem.$inferSelect)[]>()
  for (const item of items) {
    const grouped = itemsBySale.get(item.saleId) ?? []
    grouped.push(item)
    itemsBySale.set(item.saleId, grouped)
  }
  return records.map((record) => ({ ...record, items: itemsBySale.get(record.id) ?? [] }))
}

export async function getSalesByReceiptNo(receiptNo: string) {
  const context = await receiptContext()
  const records = await db.select().from(sale).where(and(
    eq(sale.orgId, context.orgId),
    context.viewAll ? undefined : eq(sale.userId, context.userId),
    like(sale.receiptNo, `%${receiptNo.trim().slice(0, 50)}%`),
  )).orderBy(desc(sale.createdAt)).limit(20)
  return withItems(records, context.orgId)
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date) || Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate > endDate) throw new Error('Invalid date range')
  const context = await receiptContext()
  const records = await db.select().from(sale).where(and(eq(sale.orgId, context.orgId), context.viewAll ? undefined : eq(sale.userId, context.userId), gte(sale.createdAt, startDate), lte(sale.createdAt, endDate))).orderBy(desc(sale.createdAt)).limit(100)
  return withItems(records, context.orgId)
}

export async function getSalesByCustomer(customerId: string) {
  const context = await receiptContext()
  const records = await db.select().from(sale).where(and(eq(sale.orgId, context.orgId), context.viewAll ? undefined : eq(sale.userId, context.userId), eq(sale.customerId, customerId))).orderBy(desc(sale.createdAt)).limit(50)
  return withItems(records, context.orgId)
}

export async function getRecentSales(limit = 20) {
  const context = await receiptContext()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const records = await db.select().from(sale).where(and(eq(sale.orgId, context.orgId), context.viewAll ? undefined : eq(sale.userId, context.userId))).orderBy(desc(sale.createdAt)).limit(safeLimit)
  return withItems(records, context.orgId)
}
