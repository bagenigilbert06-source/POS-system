'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { branch, sale, saleItem, salePayment, product, businessSettings, auditEvent, posSession, customer, salesReturn, salesReturnItem, expense, user } from '@/lib/db/schema'
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from 'drizzle-orm'
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

const voidSaleSchema = z.object({ saleId: z.string().min(1), reason: z.string().trim().min(3).max(300) })

/** Cancels a completed sale without deleting history and restores its inventory once. */
export async function voidSale(input: z.input<typeof voidSaleSchema>) {
  const data = voidSaleSchema.parse(input)
  const authorization = await requirePermission(PermissionEnum.POS_VOID)
  const { userId, organizationId: orgId } = authorization
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1)
    if (!record) throw new Error('Sale not found')
    if (!record.branchId) throw new Error('The sale has no inventory location')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(record.branchId)) throw new Error('This sale is outside your assigned branches')
    if (!['completed', 'pending'].includes(record.status)) throw new Error('Only completed or pending sales can be voided')
    const [existingReturn] = await tx.select({ id: salesReturn.id }).from(salesReturn).where(and(eq(salesReturn.saleId, record.id), eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))).limit(1)
    if (existingReturn) throw new Error('A refunded sale cannot be voided')
    const lines = await tx.select().from(saleItem).where(and(eq(saleItem.saleId, record.id), eq(saleItem.orgId, orgId)))
    if (record.status === 'completed') for (const line of lines) await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: record.branchId, quantity: line.quantity, type: 'sale_void', referenceType: 'sale_void', referenceId: record.id, reason: data.reason, userId, orgId, unitCost: Number(line.unitCostAtSale) })
    await tx.update(sale).set({ status: 'cancelled' }).where(and(eq(sale.id, record.id), eq(sale.orgId, orgId)))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'sale_voided', metadata: { saleId: record.id, receiptNo: record.receiptNo, reason: data.reason, previousStatus: record.status } })
  })
  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard/sales'); revalidatePath('/dashboard/pos'); revalidatePath('/dashboard/inventory'); revalidatePath('/dashboard/operations')
  return { success: true }
}

export async function createManualSale(input: z.input<typeof manualSaleSchema>) {
  const data = manualSaleSchema.parse(input)
  const userId = await getUserId()
  const authorization = await requirePermission(PermissionEnum.SALE_CREATE)
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
  const branchId = authorization.isOrganizationWide ? null : authorization.branchIds[0]
  if (!authorization.isOrganizationWide && !branchId) throw new Error('No assigned branch is available')
  await db.transaction(async (tx) => {
    await tx.insert(sale).values({
      id: saleId, receiptNo, subtotal: String(data.amount), taxAmount: String(taxAmount), discountAmount: '0', total: String(total),
      paymentMethod: data.paymentMethod, status: 'completed', userId, orgId, branchId,
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
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const query = db
    .select()
    .from(sale)
    .where(and(eq(sale.orgId, orgId), accessScope))
    .orderBy(desc(sale.createdAt))
    .limit(limit)
  return query
}

export type SalesPageFilters = {
  search?: string
  paymentMethod?: string
  status?: string
  customerId?: string
  cashierId?: string
  branchId?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
  sort?: 'date' | 'amount' | 'payment' | 'status'
  direction?: 'asc' | 'desc'
}

type SalesScope = Awaited<ReturnType<typeof getSalesScope>>

function endOfDayExclusive(value?: Date) {
  if (!value) return undefined
  const end = new Date(value)
  end.setDate(end.getDate() + 1)
  return end
}

async function getSalesScope(filters: SalesPageFilters) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50))
  const search = filters.search?.trim().slice(0, 80)
  const scope = and(
    eq(sale.orgId, orgId), accessScope,
    search ? or(ilike(sale.receiptNo, `%${search}%`), ilike(sql`coalesce(${sale.mpesaRef}, '')`, `%${search}%`), sql`exists (select 1 from ${salePayment} where ${salePayment.saleId} = ${sale.id} and ${salePayment.orgId} = ${orgId} and coalesce(${salePayment.reference}, '') ilike ${`%${search}%`})`) : undefined,
    filters.paymentMethod && filters.paymentMethod !== 'all' ? eq(sale.paymentMethod, filters.paymentMethod) : undefined,
    filters.status && filters.status !== 'all' ? eq(sale.status, filters.status) : undefined,
    filters.customerId ? eq(sale.customerId, filters.customerId) : undefined,
    filters.cashierId ? eq(sale.userId, filters.cashierId) : undefined,
    filters.branchId ? eq(sale.branchId, filters.branchId) : undefined,
    filters.from ? gte(sale.createdAt, filters.from) : undefined,
    endOfDayExclusive(filters.to) ? lt(sale.createdAt, endOfDayExclusive(filters.to)!) : undefined,
  )
  return { userId, authorization, orgId, scope, page, pageSize }
}

function previousPeriod(filters: SalesPageFilters) {
  if (!filters.from || !filters.to) return null
  const start = new Date(filters.from); start.setHours(0, 0, 0, 0)
  const end = endOfDayExclusive(filters.to)!
  const duration = end.getTime() - start.getTime()
  return { ...filters, from: new Date(start.getTime() - duration), to: new Date(start.getTime() - 1), page: 1 }
}

async function getScopedTotals(scope: NonNullable<SalesScope['scope']>, orgId: string, filters: SalesPageFilters) {
  const paidStatuses = ['completed', 'partially_refunded', 'refunded']
  const [[salesTotals], [refundTotals], [itemTotals], [refundedCost], [expenseTotals]] = await Promise.all([
    db.select({
      gross: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.total} else 0 end), 0)`,
      transactions: sql<number>`count(*) filter (where ${sale.status} in ('completed', 'partially_refunded', 'refunded'))`,
      cash: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'cash' then ${sale.total} else 0 end), 0)`,
      mpesa: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'mpesa' then ${sale.total} else 0 end), 0)`,
      card: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'card' then ${sale.total} else 0 end), 0)`,
      split: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'split' then ${sale.total} else 0 end), 0)`,
      credit: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'credit' then ${sale.total} else 0 end), 0)`,
      pending: sql<string>`coalesce(sum(case when ${sale.status} = 'pending' then ${sale.total} else 0 end), 0)`,
      tax: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.taxAmount} else 0 end), 0)`,
      discounts: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.discountAmount} else 0 end), 0)`,
    }).from(sale).where(scope),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`, count: sql<number>`count(*)` }).from(salesReturn).innerJoin(sale, eq(sale.id, salesReturn.saleId)).where(and(scope, eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))),
    db.select({ quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`, cogs: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)` }).from(saleItem).innerJoin(sale, eq(sale.id, saleItem.saleId)).where(and(scope, inArray(sale.status, paidStatuses))),
    db.select({ cost: sql<string>`coalesce(sum(${saleItem.totalCost} * ${salesReturnItem.quantity} / nullif(${saleItem.quantity}, 0)), 0)` }).from(salesReturnItem).innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId)).innerJoin(sale, eq(sale.id, salesReturn.saleId)).innerJoin(saleItem, and(eq(saleItem.saleId, sale.id), eq(saleItem.productId, salesReturnItem.productId))).where(and(scope, eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))),
    db.select({ total: sql<string>`coalesce(sum(${expense.amount}), 0)` }).from(expense).where(and(eq(expense.orgId, orgId), filters.branchId ? eq(expense.branchId, filters.branchId) : undefined, filters.from ? gte(expense.createdAt, filters.from) : undefined, endOfDayExclusive(filters.to) ? lt(expense.createdAt, endOfDayExclusive(filters.to)!) : undefined)),
  ])
  const gross = Number(salesTotals?.gross ?? 0), refunds = Number(refundTotals?.total ?? 0), cogs = Math.max(0, Number(itemTotals?.cogs ?? 0) - Number(refundedCost?.cost ?? 0)), net = gross - refunds, grossProfit = net - cogs, expensesTotal = Number(expenseTotals?.total ?? 0)
  return { ...salesTotals, refunds, refundCount: Number(refundTotals?.count ?? 0), net, quantity: Number(itemTotals?.quantity ?? 0), cogs, grossProfit, grossMargin: net ? grossProfit / net * 100 : 0, expenses: expensesTotal, netProfit: grossProfit - expensesTotal, average: Number(salesTotals?.transactions ?? 0) ? net / Number(salesTotals?.transactions) : 0 }
}

/** Server-side source of truth for the Sales page. The table and KPIs share this scope. */
export async function getSalesPageData(filters: SalesPageFilters = {}) {
  const { orgId, scope, page, pageSize } = await getSalesScope(filters)
  const orderColumn = filters.sort === 'amount' ? sale.total : filters.sort === 'payment' ? sale.paymentMethod : filters.sort === 'status' ? sale.status : sale.createdAt
  const order = (filters.direction ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn)
  const [rows, [count], totals] = await Promise.all([
    db.select({ record: sale, customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email, branchName: branch.name, cashierName: user.name })
      .from(sale)
      .leftJoin(customer, eq(customer.id, sale.customerId))
      .leftJoin(branch, eq(branch.id, sale.branchId))
      .leftJoin(user, eq(user.id, sale.userId))
      .where(scope).orderBy(order, desc(sale.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(sale).where(scope),
    getScopedTotals(scope!, orgId, filters),
  ])
  const previous = previousPeriod(filters)
  const previousTotals = previous ? await getScopedTotals((await getSalesScope(previous)).scope!, orgId, previous) : null
  const compare = (current: number, prior: number) => prior ? ((current - prior) / Math.abs(prior)) * 100 : null
  return { rows, total: Number(count?.value ?? 0), page, pageSize, totals, comparison: previousTotals ? { net: compare(totals.net, previousTotals.net), transactions: compare(Number(totals.transactions ?? 0), Number(previousTotals.transactions ?? 0)), average: compare(totals.average, previousTotals.average), grossProfit: compare(totals.grossProfit, previousTotals.grossProfit) } : null }
}

export async function getSalesFilterOptions() {
  const { orgId, scope } = await getSalesScope({})
  const [customers, cashiers, branches] = await Promise.all([
    db.selectDistinct({ id: customer.id, name: customer.name }).from(sale).innerJoin(customer, eq(customer.id, sale.customerId)).where(scope).orderBy(customer.name).limit(500),
    db.selectDistinct({ id: user.id, name: user.name }).from(sale).innerJoin(user, eq(user.id, sale.userId)).where(scope).orderBy(user.name).limit(200),
    db.select({ id: branch.id, name: branch.name }).from(branch).where(eq(branch.organizationId, orgId)).orderBy(branch.name),
  ])
  return { customers, cashiers, branches }
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

/** Exports the entire authorized, filtered result set; it never reuses page rows. */
export async function exportSalesCsv(filters: SalesPageFilters = {}) {
  await requirePermission(PermissionEnum.REPORT_EXPORT)
  const { orgId, scope } = await getSalesScope({ ...filters, page: 1, pageSize: 100 })
  const rows = await db.select({
    receipt: sale.receiptNo, date: sale.createdAt, customer: customer.name, cashier: user.name, branch: branch.name,
    subtotal: sale.subtotal, discount: sale.discountAmount, tax: sale.taxAmount, total: sale.total, method: sale.paymentMethod, reference: sale.mpesaRef, status: sale.status,
    refunds: sql<string>`coalesce((select sum(${salesReturn.amount}) from ${salesReturn} where ${salesReturn.saleId} = ${sale.id} and ${salesReturn.orgId} = ${orgId} and ${salesReturn.status} = 'completed'), 0)`,
    cogs: sql<string>`coalesce((select sum(${saleItem.totalCost}) from ${saleItem} where ${saleItem.saleId} = ${sale.id} and ${saleItem.orgId} = ${orgId}), 0)`,
  }).from(sale).leftJoin(customer, eq(customer.id, sale.customerId)).leftJoin(user, eq(user.id, sale.userId)).leftJoin(branch, eq(branch.id, sale.branchId)).where(scope).orderBy(desc(sale.createdAt))
  const header = ['Receipt', 'Date', 'Customer', 'Cashier', 'Branch', 'Subtotal', 'Discount', 'Tax', 'Gross amount', 'Refund', 'Net amount', 'COGS', 'Gross profit', 'Payment method', 'Payment reference', 'Status']
  const lines = rows.map((row) => { const gross = Number(row.total), refunds = Number(row.refunds), cogs = Number(row.cogs), net = gross - refunds; return [row.receipt, row.date.toISOString(), row.customer ?? 'Walk-in', row.cashier ?? '', row.branch ?? '', row.subtotal, row.discount, row.tax, gross.toFixed(2), refunds.toFixed(2), net.toFixed(2), cogs.toFixed(2), (net - cogs).toFixed(2), row.method, row.reference ?? '', row.status].map(csvCell).join(',') })
  return [header.map(csvCell).join(','), ...lines].join('\n')
}

export async function getSalesAnalytics(filters: SalesPageFilters = {}) {
  const { scope } = await getSalesScope(filters)
  const paid = inArray(sale.status, ['completed', 'partially_refunded', 'refunded'])
  const [trend, payments, products, cashiers, customers] = await Promise.all([
    db.select({ label: sql<string>`to_char(${sale.createdAt}, 'YYYY-MM-DD')`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).where(and(scope, paid)).groupBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`).limit(366),
    db.select({ label: sale.paymentMethod, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).where(and(scope, paid)).groupBy(sale.paymentMethod).orderBy(desc(sql`sum(${sale.total})`)),
    db.select({ label: saleItem.productName, quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`, value: sql<number>`coalesce(sum(${saleItem.totalPrice}), 0)`, profit: sql<number>`coalesce(sum(${saleItem.totalPrice} - ${saleItem.totalCost}), 0)` }).from(saleItem).innerJoin(sale, eq(sale.id, saleItem.saleId)).where(and(scope, paid)).groupBy(saleItem.productName).orderBy(desc(sql`sum(${saleItem.totalPrice})`)).limit(10),
    db.select({ label: user.name, quantity: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).leftJoin(user, eq(user.id, sale.userId)).where(and(scope, paid)).groupBy(user.name).orderBy(desc(sql`sum(${sale.total})`)).limit(10),
    db.select({ label: customer.name, quantity: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).innerJoin(customer, eq(customer.id, sale.customerId)).where(and(scope, paid)).groupBy(customer.name).orderBy(desc(sql`sum(${sale.total})`)).limit(10),
  ])
  return { trend, payments, products, cashiers, customers }
}

export async function getSaleWithItems(saleId: string) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const [saleRecord] = await db
    .select({ record: sale, customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email, cashierName: user.name, branchName: branch.name })
    .from(sale)
    .leftJoin(customer, eq(customer.id, sale.customerId))
    .leftJoin(user, eq(user.id, sale.userId))
    .leftJoin(branch, eq(branch.id, sale.branchId))
    .where(and(eq(sale.id, saleId), eq(sale.orgId, orgId), accessScope))
    .limit(1)
  if (!saleRecord) return null
  const [items, payments, returns] = await Promise.all([
    db
    .select()
    .from(saleItem)
    .where(and(eq(saleItem.saleId, saleId), eq(saleItem.orgId, orgId))),
    db.select().from(salePayment).where(and(eq(salePayment.saleId, saleId), eq(salePayment.orgId, orgId))).orderBy(salePayment.createdAt),
    db.select().from(salesReturn).where(and(eq(salesReturn.saleId, saleId), eq(salesReturn.orgId, orgId))).orderBy(desc(salesReturn.createdAt)),
  ])
  return { ...saleRecord, items, payments, returns }
}

export async function getDashboardStats() {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_ALL, PermissionEnum.REPORT_VIEW])
  const orgId = await getOrgId(userId)
  const saleScope = authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todaySales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, today)))

  const [monthSales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, monthStart)))

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
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, sevenDaysAgo)))
    .groupBy(sql`DATE(${sale.createdAt})`)
    .orderBy(sql`DATE(${sale.createdAt})`)

  const recentSales = await db
    .select()
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope))
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
