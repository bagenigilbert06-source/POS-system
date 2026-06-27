'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sale, saleItem, product, organization } from '@/lib/db/schema'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId, generateReceiptNo } from '@/lib/utils'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const org = await db
    .select()
    .from(organization)
    .where(eq(organization.userId, userId))
    .limit(1)
  return org[0]?.id ?? userId
}

export type CartItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export async function createSale(data: {
  customerId?: string
  items: CartItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paymentMethod: string
  mpesaRef?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const saleId = generateId()
  const receiptNo = generateReceiptNo()

  await db.insert(sale).values({
    id: saleId,
    receiptNo,
    customerId: data.customerId,
    subtotal: String(data.subtotal),
    taxAmount: String(data.taxAmount),
    discountAmount: String(data.discountAmount),
    total: String(data.total),
    paymentMethod: data.paymentMethod,
    mpesaRef: data.mpesaRef,
    status: 'completed',
    userId,
    orgId,
  })

  for (const item of data.items) {
    await db.insert(saleItem).values({
      id: generateId(),
      saleId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.totalPrice),
      userId,
      orgId,
    })

    // decrement stock
    await db
      .update(product)
      .set({ stock: sql`${product.stock} - ${item.quantity}` })
      .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  return { saleId, receiptNo }
}

export async function getSales(limit = 50) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  return db
    .select()
    .from(sale)
    .where(eq(sale.orgId, orgId))
    .orderBy(desc(sale.createdAt))
    .limit(limit)
}

export async function getSaleWithItems(saleId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const [saleRecord] = await db
    .select()
    .from(sale)
    .where(and(eq(sale.id, saleId), eq(sale.orgId, orgId)))
    .limit(1)
  if (!saleRecord) return null
  const items = await db
    .select()
    .from(saleItem)
    .where(and(eq(saleItem.saleId, saleId), eq(saleItem.orgId, orgId)))
  return { sale: saleRecord, items }
}

export async function getDashboardStats() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todaySales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), gte(sale.createdAt, today)))

  const [monthSales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), gte(sale.createdAt, monthStart)))

  const [productCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(product)
    .where(eq(product.orgId, orgId))

  const lowStockProducts = await db
    .select()
    .from(product)
    .where(and(eq(product.orgId, orgId), sql`${product.stock} <= ${product.minStock}`))

  // Last 7 days revenue
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const weeklyRevenue = await db
    .select({
      date: sql<string>`DATE(${sale.createdAt})`,
      revenue: sql<string>`COALESCE(SUM(${sale.total}), 0)`,
    })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), gte(sale.createdAt, sevenDaysAgo)))
    .groupBy(sql`DATE(${sale.createdAt})`)
    .orderBy(sql`DATE(${sale.createdAt})`)

  const recentSales = await db
    .select()
    .from(sale)
    .where(eq(sale.orgId, orgId))
    .orderBy(desc(sale.createdAt))
    .limit(5)

  return {
    todayRevenue: parseFloat(todaySales.total || '0'),
    todaySalesCount: Number(todaySales.count),
    monthRevenue: parseFloat(monthSales.total || '0'),
    monthSalesCount: Number(monthSales.count),
    productCount: Number(productCount.count),
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    weeklyRevenue,
    recentSales,
  }
}
