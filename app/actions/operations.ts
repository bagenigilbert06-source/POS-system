'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cashMovement, inventoryLoss, posSession, product, sale, saleItem, salesReturn, salesReturnItem, stockMovement } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { generateId } from '@/lib/utils'

async function context() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) throw new Error('Unauthorized'); const organization = await OrganizationService.getPrimaryOrganization(session.user.id); if (!organization) throw new Error('No organization'); return { userId: session.user.id, orgId: organization.id } }
const refresh = () => ['/dashboard','/dashboard/operations','/dashboard/inventory','/dashboard/sales','/dashboard/reports'].forEach((path) => revalidatePath(path))

export async function getOperationsData() {
  const { orgId } = await context()
  const [sessions, returns, losses, products, sales] = await Promise.all([
    db.select().from(posSession).where(eq(posSession.orgId, orgId)).orderBy(desc(posSession.openedAt)).limit(30),
    db.select().from(salesReturn).where(eq(salesReturn.orgId, orgId)).orderBy(desc(salesReturn.createdAt)).limit(50),
    db.select().from(inventoryLoss).where(eq(inventoryLoss.orgId, orgId)).orderBy(desc(inventoryLoss.createdAt)).limit(50),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(product.name),
    db.select().from(sale).where(and(eq(sale.orgId, orgId), eq(sale.status, 'completed'))).orderBy(desc(sale.createdAt)).limit(100),
  ])
  return { sessions, returns, losses, products, sales }
}

export async function recordInventoryLoss(input: { productId: string; quantity: number; type: string; reason: string }) {
  const data = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive(), type: z.enum(['damaged','expired','lost','theft','count_adjustment']), reason: z.string().trim().min(3).max(300) }).parse(input)
  const { userId, orgId } = await context()
  await db.transaction(async (tx) => { const [item] = await tx.select().from(product).where(and(eq(product.id, data.productId), eq(product.orgId, orgId))).limit(1); if (!item) throw new Error('Product not found'); if (item.stock < data.quantity) throw new Error('Loss quantity exceeds available stock'); const id = generateId(); const after = item.stock - data.quantity; await tx.insert(inventoryLoss).values({ id, lossNo: `LOSS-${Date.now().toString().slice(-8)}`, productId: item.id, productName: item.name, quantity: data.quantity, type: data.type, unitCost: item.buyingPrice, totalCost: String(Number(item.buyingPrice) * data.quantity), reason: data.reason, userId, orgId }); await tx.update(product).set({ stock: after, updatedAt: new Date() }).where(and(eq(product.id, item.id), eq(product.orgId, orgId))); await tx.insert(stockMovement).values({ id: generateId(), productId: item.id, productName: item.name, type: `loss_${data.type}`, quantity: -data.quantity, stockBefore: item.stock, stockAfter: after, referenceType: 'inventory_loss', referenceId: id, reason: data.reason, userId, orgId }) })
  refresh()
}

export async function refundSale(input: { saleId: string; refundMethod: string; reason: string; disposition: string }) {
  const data = z.object({ saleId: z.string().min(1), refundMethod: z.enum(['cash','mpesa','card','store_credit']), reason: z.string().trim().min(3).max(300), disposition: z.enum(['restock','damaged']) }).parse(input)
  const { userId, orgId } = await context()
  await db.transaction(async (tx) => { const [[record], prior, items] = await Promise.all([tx.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1), tx.select().from(salesReturn).where(and(eq(salesReturn.saleId, data.saleId), eq(salesReturn.orgId, orgId))).limit(1), tx.select().from(saleItem).where(and(eq(saleItem.saleId, data.saleId), eq(saleItem.orgId, orgId)))]); if (!record) throw new Error('Sale not found'); if (prior.length) throw new Error('This sale has already been refunded'); const returnId = generateId(); const returnNo = `CN-${Date.now().toString().slice(-8)}`; await tx.insert(salesReturn).values({ id: returnId, returnNo, saleId: record.id, receiptNo: record.receiptNo, amount: record.total, refundMethod: data.refundMethod, reason: data.reason, userId, orgId }); for (const line of items) { await tx.insert(salesReturnItem).values({ id: generateId(), returnId, productId: line.productId, productName: line.productName, quantity: line.quantity, unitPrice: line.unitPrice, total: line.totalPrice, disposition: data.disposition, orgId }); const [stock] = await tx.select().from(product).where(and(eq(product.id, line.productId), eq(product.orgId, orgId))).limit(1); if (stock && data.disposition === 'restock') { await tx.update(product).set({ stock: sql`${product.stock} + ${line.quantity}`, updatedAt: new Date() }).where(and(eq(product.id, line.productId), eq(product.orgId, orgId))); await tx.insert(stockMovement).values({ id: generateId(), productId: line.productId, productName: line.productName, type: 'sales_return', quantity: line.quantity, stockBefore: stock.stock, stockAfter: stock.stock + line.quantity, referenceType: 'credit_note', referenceId: returnId, reason: returnNo, userId, orgId }) } } await tx.update(sale).set({ status: 'refunded' }).where(and(eq(sale.id, record.id), eq(sale.orgId, orgId))) })
  refresh()
}

export async function openPosSession(openingCash: number) { const amount = z.coerce.number().nonnegative().max(999999999).parse(openingCash); const { userId, orgId } = await context(); const [existing] = await db.select().from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.status, 'open'))).limit(1); if (existing) throw new Error('Close the current register first'); await db.insert(posSession).values({ id: generateId(), sessionNo: `REG-${Date.now().toString().slice(-8)}`, openingCash: String(amount), openedBy: userId, orgId }); refresh() }

export async function closePosSession(closingCash: number, notes = '') { const counted = z.coerce.number().nonnegative().max(999999999).parse(closingCash); const { userId, orgId } = await context(); const [current] = await db.select().from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.status, 'open'))).orderBy(desc(posSession.openedAt)).limit(1); if (!current) throw new Error('No open register'); const [[cashSales], [moves]] = await Promise.all([db.select({ total: sql<string>`coalesce(sum(${sale.total}),0)` }).from(sale).where(and(eq(sale.orgId, orgId), eq(sale.status, 'completed'), eq(sale.paymentMethod, 'cash'), gte(sale.createdAt, current.openedAt))), db.select({ total: sql<string>`coalesce(sum(case when ${cashMovement.type}='cash_in' then ${cashMovement.amount} else -${cashMovement.amount} end),0)` }).from(cashMovement).where(eq(cashMovement.sessionId, current.id))]); const expected = Number(current.openingCash) + Number(cashSales.total) + Number(moves.total); await db.update(posSession).set({ status: 'closed', expectedCash: String(expected), closingCash: String(counted), variance: String(counted - expected), notes: notes || null, closedBy: userId, closedAt: new Date() }).where(and(eq(posSession.id, current.id), eq(posSession.orgId, orgId))); refresh() }
