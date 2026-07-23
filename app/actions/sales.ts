'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sale, saleItem, product, businessSettings, stockMovement, auditEvent } from '@/lib/db/schema'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId, generateReceiptNo } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string, moduleId = 'sales') {
  const organization = await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, userId)
  if (!config?.enabledModules.includes(moduleId)) throw new Error(`${moduleId} is not enabled for this workspace`)
  return organization.id
}

export type CartItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

const manualSaleSchema = z.object({
  description: z.string().trim().min(2).max(120),
  amount: z.number().positive().max(999999999),
  paymentMethod: z.string().trim().min(1).max(40),
})

export async function createManualSale(input: z.input<typeof manualSaleSchema>) {
  const data = manualSaleSchema.parse(input)
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'sales')
  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods,
    taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate,
    pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  const allowedMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!allowedMethods.includes(data.paymentMethod)) throw new Error('Choose a payment method enabled for this workspace')
  const rate = settings?.taxEnabled ? Number(settings.taxRate ?? 0) / 100 : 0
  const taxAmount = rate > 0 ? (settings?.pricesIncludeTax ? data.amount - (data.amount / (1 + rate)) : data.amount * rate) : 0
  const total = settings?.pricesIncludeTax ? data.amount : data.amount + taxAmount
  const saleId = generateId()
  const receiptNo = generateReceiptNo()
  await db.transaction(async (tx) => {
    await tx.insert(sale).values({
      id: saleId, receiptNo, subtotal: String(data.amount), taxAmount: String(taxAmount), discountAmount: '0', total: String(total),
      paymentMethod: data.paymentMethod, status: 'completed', userId, orgId,
    })
    await tx.insert(saleItem).values({
      id: generateId(), saleId, productId: `manual-${saleId}`, productName: data.description, quantity: 1,
      unitPrice: String(data.amount), totalPrice: String(total), userId, orgId,
    })
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  return { saleId, receiptNo }
}

export async function createSale(data: {
  customerId?: string
  items: CartItem[]
  subtotal: number
  discountAmount: number
  total: number
  paymentMethod: string
  mpesaRef?: string
  amountReceived?: number
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')
  
  // Load business settings for tax configuration
  const [settings] = await db.select({
    taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate,
    pricesIncludeTax: businessSettings.pricesIncludeTax,
    paymentMethods: businessSettings.paymentMethods,
  }).from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  
  const allowedMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : ['cash']
  if (!allowedMethods.includes(data.paymentMethod)) {
    throw new Error('Payment method not enabled for this workspace')
  }
  
  // Server-side calculation of tax (do not trust client)
  const rate = settings?.taxEnabled ? Number(settings.taxRate ?? 0) / 100 : 0
  const calculatedTax = rate > 0 
    ? (settings?.pricesIncludeTax 
      ? data.subtotal - (data.subtotal / (1 + rate)) 
      : data.subtotal * rate)
    : 0
  
  // Validate discount doesn't exceed subtotal + tax
  const maxDiscount = data.subtotal + calculatedTax
  if (data.discountAmount < 0 || data.discountAmount > maxDiscount) {
    throw new Error(`Discount must be between 0 and ${maxDiscount}`)
  }
  
  // Recalculate total
  const calculatedTotal = data.subtotal + calculatedTax - data.discountAmount
  
  // Validate cash payment
  if (data.paymentMethod === 'cash') {
    if (!data.amountReceived || data.amountReceived < calculatedTotal) {
      throw new Error('Insufficient payment received')
    }
  }
  
  const saleId = generateId()
  const receiptNo = generateReceiptNo()

  await db.transaction(async (tx) => {
    // Create the sale
    await tx.insert(sale).values({
      id: saleId,
      receiptNo,
      customerId: data.customerId,
      subtotal: String(data.subtotal),
      taxAmount: String(calculatedTax),
      discountAmount: String(data.discountAmount),
      total: String(calculatedTotal),
      paymentMethod: data.paymentMethod,
      mpesaRef: data.mpesaRef,
      status: 'completed',
      userId,
      orgId,
    })

    // Process each item
    for (const item of data.items) {
      const [current] = await tx.select({ stock: product.stock, name: product.name }).from(product).where(and(eq(product.id, item.productId), eq(product.orgId, orgId))).limit(1)
      if (!current) throw new Error(`Product ${item.productName} was not found`)
      if (current.stock < item.quantity) throw new Error(`Insufficient stock for ${item.productName}`)
      
      await tx.insert(saleItem).values({
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

      // Decrement stock
      await tx
        .update(product)
        .set({ stock: sql`${product.stock} - ${item.quantity}` })
        .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))
      
      // Record stock movement
      await tx.insert(stockMovement).values({ 
        id: generateId(), 
        productId: item.productId, 
        productName: current.name, 
        type: 'sale', 
        quantity: -item.quantity, 
        stockBefore: current.stock, 
        stockAfter: current.stock - item.quantity, 
        referenceType: 'sale', 
        referenceId: saleId, 
        reason: receiptNo, 
        userId, 
        orgId 
      })
    }
    
    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'sale_created',
      metadata: {
        saleId,
        receiptNo,
        subtotal: data.subtotal,
        tax: calculatedTax,
        discount: data.discountAmount,
        total: calculatedTotal,
        items: data.items.length,
        paymentMethod: data.paymentMethod,
      },
    })
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  return { saleId, receiptNo, tax: calculatedTax, total: calculatedTotal }
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
