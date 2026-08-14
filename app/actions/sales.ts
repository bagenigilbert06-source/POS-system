'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { branch, sale, saleItem, salePayment, product, businessSettings, auditEvent, posSession, customer } from '@/lib/db/schema'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId, generateReceiptNo } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'
import { requireAnyPermission, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { applyInventoryMovement, consumeInventoryCost } from '@/lib/inventory/inventory-service'

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
  await requirePermission(PermissionEnum.SALE_CREATE)
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
  paymentReference?: string
  mpesaPaymentRequestId?: string
  amountReceived?: number
  idempotencyKey?: string
  ageVerified?: boolean
}) {
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 250) throw new Error('Add between 1 and 250 products')
  if (!Number.isFinite(data.discountAmount) || data.discountAmount < 0) throw new Error('Invalid discount amount')
  if (!data.idempotencyKey || data.idempotencyKey.length > 100) throw new Error('A valid transaction ID is required')
  const posAuthorization = await getPosAuthorizationContext()
  const userId = posAuthorization?.userId ?? await getUserId()
  const saleAuthorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!saleAuthorization.permissions.includes(PermissionEnum.POS_SELL) && !saleAuthorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  const orgId = posAuthorization?.organizationId ?? await getOrgId(userId, 'pos')
  const idempotencyKey = data.idempotencyKey
  
  // Check for duplicate submission (idempotency)
  const [existingSale] = await db.select().from(sale)
    .where(and(
      eq(sale.orgId, orgId),
      eq(sale.idempotencyKey, idempotencyKey)
    )).limit(1)
  
  if (existingSale) {
    const existingItems = await db.select({ saleItemId: saleItem.id, productId: saleItem.productId })
      .from(saleItem).where(and(eq(saleItem.saleId, existingSale.id), eq(saleItem.orgId, orgId)))
    return { 
      saleId: existingSale.id, 
      receiptNo: existingSale.receiptNo, 
      tax: parseFloat(existingSale.taxAmount),
      rounding: parseFloat(existingSale.roundingAmount),
      total: parseFloat(existingSale.total),
      idempotencyKey,
      items: existingItems,
      isDuplicate: true
    }
  }

  const [activeShift] = await db.select({ id: posSession.id }).from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error('Start your shift before completing a sale')
  let saleBranchId = posAuthorization?.branchId ?? saleAuthorization.branchIds[0]
  if (!saleBranchId) {
    const [mainBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), eq(branch.isMain, true))).limit(1)
    saleBranchId = mainBranch?.id
  }
  if (!saleBranchId) throw new Error('No authorized branch is available for this sale')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  const requiresAgeVerification = workspace?.businessCategory === 'liquor_shop'
  if (requiresAgeVerification && !data.ageVerified) {
    throw new Error('Age verification is required before completing this liquor sale')
  }
  
  if (data.discountAmount > 0 && !saleAuthorization.permissions.includes(PermissionEnum.POS_DISCOUNT)) throw new Error('A supervisor or manager must apply this discount')
  const productIds = Array.from(new Set(data.items.map((line) => line.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate products must be combined into one basket line')
  const catalogue = await db.select({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, active: product.isActive })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const catalogueById = new Map(catalogue.map((item) => [item.id, item]))
  const normalizedItems: CartItem[] = []
  for (const line of data.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Invalid sale quantity')
    const catalogueItem = catalogueById.get(line.productId)
    if (!catalogueItem?.active) throw new Error('A selected product is unavailable')
    const unitPrice = Number(catalogueItem.sellingPrice)
    normalizedItems.push({ productId: catalogueItem.id, productName: catalogueItem.name, quantity: line.quantity, unitPrice, totalPrice: unitPrice * line.quantity })
  }
  const serverSubtotal = normalizedItems.reduce((sum, line) => sum + line.totalPrice, 0)

  if (data.customerId) {
    const [selectedCustomer] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, data.customerId), eq(customer.orgId, orgId))).limit(1)
    if (!selectedCustomer) throw new Error('Customer is not available in this workspace')
  }

  // Load business settings for tax configuration
  const [settings] = await db.select({
    taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate,
    pricesIncludeTax: businessSettings.pricesIncludeTax,
    paymentMethods: businessSettings.paymentMethods,
  }).from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  
  const configuredMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  const allowedMethods = configuredMethods.length > 0 ? configuredMethods : ['cash']
  if (!['cash', 'mpesa', 'card'].includes(data.paymentMethod)) {
    throw new Error('Unsupported POS payment method')
  }
  if (!allowedMethods.includes(data.paymentMethod)) {
    throw new Error('Payment method not enabled for this workspace')
  }
  let paymentReference = (data.paymentReference ?? data.mpesaRef ?? '').trim().slice(0, 120)
  if (data.paymentMethod === 'card' && !paymentReference) throw new Error('Enter the card approval or terminal reference')
  
  // Server-side calculation of tax (do not trust client)
  const rate = settings?.taxEnabled ? Number(settings.taxRate ?? 0) / 100 : 0
  const calculatedTax = rate > 0 
    ? (settings?.pricesIncludeTax 
      ? serverSubtotal - (serverSubtotal / (1 + rate))
      : serverSubtotal * rate)
    : 0
  
  // Validate discount doesn't exceed subtotal + tax
  const grossBeforeDiscount = settings?.pricesIncludeTax ? serverSubtotal : serverSubtotal + calculatedTax
  const maxDiscount = grossBeforeDiscount
  if (data.discountAmount < 0 || data.discountAmount > maxDiscount) {
    throw new Error(`Discount must be between 0 and ${maxDiscount}`)
  }
  
  // Daraja accepts whole-shilling payments. Keep the adjustment explicit and auditable.
  const unroundedTotal = Number((grossBeforeDiscount - data.discountAmount).toFixed(2))
  const mpesaAmount = calculateMpesaAmount(unroundedTotal)
  const calculatedTotal = data.paymentMethod === 'mpesa' ? mpesaAmount.amount : unroundedTotal
  const roundingAmount = data.paymentMethod === 'mpesa' ? mpesaAmount.roundingAmount : 0

  if (data.paymentMethod === 'mpesa') {
    throw new Error('M-Pesa sales are completed automatically by the verified Daraja callback')
  }
  
  // Validate cash payment
  let changeAmount = 0
  const amountReceived = Number(data.amountReceived)
  if (data.paymentMethod === 'cash') {
    if (!Number.isFinite(amountReceived) || amountReceived < calculatedTotal) {
      throw new Error('Insufficient payment received')
    }
    changeAmount = amountReceived - calculatedTotal
  }
  
  const saleId = generateId()
  const receiptNo = generateReceiptNo()
  const saleItems = normalizedItems.map((item) => ({ ...item, saleItemId: generateId() }))

  try {
    await db.transaction(async (tx) => {
    // Verify and deduct branch stock atomically through the inventory ledger.
    const costByProduct = new Map<string, { unitCost: number; totalCost: number }>()
    for (const item of saleItems) {
      await applyInventoryMovement(tx, { productId: item.productId, productName: item.productName, branchId: saleBranchId, quantity: -item.quantity, type: 'sale', referenceType: 'sale', referenceId: saleId, reason: receiptNo, userId, orgId })
      costByProduct.set(item.productId, await consumeInventoryCost(tx, { productId: item.productId, branchId: saleBranchId, orgId, quantity: item.quantity }))
    }
    
    // Create the sale
    await tx.insert(sale).values({
      id: saleId,
      receiptNo,
      customerId: data.customerId,
      subtotal: String(serverSubtotal),
      taxAmount: String(calculatedTax),
      discountAmount: String(data.discountAmount),
      roundingAmount: String(roundingAmount),
      total: String(calculatedTotal),
      amountReceived: data.paymentMethod === 'cash' ? String(amountReceived) : null,
      change: data.paymentMethod === 'cash' ? String(changeAmount) : null,
      paymentMethod: data.paymentMethod,
      mpesaRef: data.paymentMethod === 'mpesa' ? paymentReference : null,
      ageVerified: requiresAgeVerification,
      ageVerifiedAt: requiresAgeVerification ? new Date() : null,
      ageVerifiedBy: requiresAgeVerification ? userId : null,
      status: 'completed',
      idempotencyKey,
      userId,
      orgId,
      branchId: saleBranchId,
      posSessionId: activeShift.id,
    })

    // Process each item to create sale items and stock movements
    await tx.insert(saleItem).values(saleItems.map((item) => ({
        id: item.saleItemId,
        saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
        unitCostAtSale: String(costByProduct.get(item.productId)?.unitCost ?? 0),
        totalCost: String(costByProduct.get(item.productId)?.totalCost ?? 0),
        userId,
        orgId,
      })))

    await tx.insert(salePayment).values({
      id: generateId(), saleId, method: data.paymentMethod, amount: String(calculatedTotal),
      reference: paymentReference || null, status: 'completed', userId, orgId,
    })
    
    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'sale_created',
      metadata: {
        saleId,
        receiptNo,
        subtotal: serverSubtotal,
        tax: calculatedTax,
        discount: data.discountAmount,
        rounding: roundingAmount,
        total: calculatedTotal,
        items: normalizedItems.length,
        paymentMethod: data.paymentMethod,
        amountReceived: data.paymentMethod === 'cash' ? amountReceived : null,
        change: data.paymentMethod === 'cash' ? changeAmount : null,
      },
    })
    })
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } }
    if (databaseError.code === '23505' || databaseError.cause?.code === '23505') {
      const [duplicate] = await db.select().from(sale).where(and(eq(sale.orgId, orgId), eq(sale.idempotencyKey, idempotencyKey))).limit(1)
      if (duplicate) {
        const duplicateItems = await db.select({ saleItemId: saleItem.id, productId: saleItem.productId })
          .from(saleItem).where(and(eq(saleItem.saleId, duplicate.id), eq(saleItem.orgId, orgId)))
        return {
          saleId: duplicate.id,
          receiptNo: duplicate.receiptNo,
          tax: Number(duplicate.taxAmount),
          rounding: Number(duplicate.roundingAmount),
          total: Number(duplicate.total),
          idempotencyKey,
          items: duplicateItems,
          isDuplicate: true,
        }
      }
    }
    throw error
  }

  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  return { saleId, receiptNo, tax: calculatedTax, rounding: roundingAmount, total: calculatedTotal, idempotencyKey, items: saleItems.map(({ saleItemId, productId }) => ({ saleItemId, productId })) }
}

export async function getSales(limit = 50) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const query = db
    .select()
    .from(sale)
    .where(and(eq(sale.orgId, orgId), authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL) ? undefined : eq(sale.userId, userId)))
    .orderBy(desc(sale.createdAt))
    .limit(limit)
  return query
}

export async function getSaleWithItems(saleId: string) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const [saleRecord] = await db
    .select()
    .from(sale)
    .where(and(eq(sale.id, saleId), eq(sale.orgId, orgId), authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL) ? undefined : eq(sale.userId, userId)))
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
  await requireAnyPermission([PermissionEnum.SALES_VIEW_ALL, PermissionEnum.REPORT_VIEW])
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
