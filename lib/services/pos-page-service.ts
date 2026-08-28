import { and, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, businessSettings, cashMovement, category, customer, inventoryBalance, inventoryLot, pharmacyProduct, posPinCredential, posSession, posTerminal, product, productPackage, sale, salesReturn } from '@/lib/db/schema'
import { readThroughRedis } from '@/lib/cache/redis-cache'
import type { AuthorizationContext } from '@/lib/auth/authorization'
import { filterPharmacyCatalog } from '@/lib/pharmacy/rules'

function receiptSettings(settings: typeof businessSettings.$inferSelect | undefined) {
  const methods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  return {
    displayName: settings?.displayName || 'Business',
    receiptBusinessName: settings?.receiptBusinessName || settings?.displayName || 'Business',
    receiptPhone: settings?.receiptPhone || '', receiptAddress: settings?.receiptAddress || '',
    receiptFooter: settings?.receiptFooter || 'Thank you for your purchase',
    receiptLayout: settings?.receiptLayout === 'detailed' ? 'detailed' as const : 'thermal' as const,
    receiptTemplate: settings?.receiptTemplate === 'logo' || settings?.receiptTemplate === 'cafe' ? settings.receiptTemplate as 'logo' | 'cafe' : 'classic' as const,
    receiptLogoUrl: settings?.receiptLogoUrl || '', taxEnabled: settings?.taxEnabled || false,
    taxRate: Number(settings?.taxRate || 0), taxName: settings?.taxName || 'VAT', pricesIncludeTax: settings?.pricesIncludeTax || false,
    paymentMethods: methods.length ? methods : ['cash'], showTaxOnReceipt: settings?.showTaxOnReceipt || false,
    receiptShowPhone: settings?.receiptShowPhone ?? true, receiptShowAddress: settings?.receiptShowAddress ?? true,
    receiptShowCashier: settings?.receiptShowCashier ?? true, receiptShowCustomer: settings?.receiptShowCustomer ?? true,
    receiptShowPayment: settings?.receiptShowPayment ?? true, receiptShowQrCode: settings?.receiptShowQrCode ?? false,
    receiptShowItemSku: settings?.receiptShowItemSku ?? false,
    receiptPrintingMode: settings?.receiptPrintingMode === 'browser' ? 'browser' as const : 'direct' as const,
    receiptPrinterName: settings?.receiptPrinterName || '', receiptPaperWidth: settings?.receiptPaperWidth === 58 ? 58 as const : 80 as const,
    receiptAutoPrint: settings?.receiptAutoPrint ?? false, receiptPrintCustomerCopy: settings?.receiptPrintCustomerCopy ?? true,
    receiptPrintCopies: Math.max(1, Math.min(5, settings?.receiptPrintCopies ?? 1)), receiptCashDrawerPulse: settings?.receiptCashDrawerPulse ?? false,
  }
}

/** Complete first-render POS model. Authentication is resolved by the page once;
 * every read below is scoped with that trusted organization context. */
export async function getPosPageData(authorization: AuthorizationContext, includeCustomers: boolean, pharmacyWorkspace = false) {
  const orgId = authorization.organizationId
  const terminalId = (authorization as AuthorizationContext & { terminalId?: string }).terminalId
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const branchFilter = authorization.isOrganizationWide
    ? eq(branch.isMain, true)
    : eq(branch.id, authorization.branchIds[0] ?? '')

  const [products, packages, medicineMetadata, categories, customers, settingsRows, sessionRows, branchRows, pinRows] = await Promise.all([
    readThroughRedis({ namespace: 'products', organizationId: orgId, variant: 'list:active:', ttlSeconds: 120, load: () => db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(desc(product.createdAt)) }),
    db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), eq(productPackage.isActive, true))).orderBy(productPackage.baseUnitQuantity),
    db.select().from(pharmacyProduct).where(eq(pharmacyProduct.organizationId, orgId)),
    readThroughRedis({ namespace: 'categories', organizationId: orgId, variant: 'pos-filter-list', ttlSeconds: 600, load: () => db.select({ id: category.id, name: category.name, parentCategoryId: category.parentCategoryId, isActive: category.isActive }).from(category).where(eq(category.orgId, orgId)).orderBy(category.name) }),
    includeCustomers ? db.select().from(customer).where(eq(customer.orgId, orgId)).orderBy(desc(customer.createdAt)) : Promise.resolve([]),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1),
    db.select().from(posSession).where(and(eq(posSession.orgId, orgId), terminalId ? eq(posSession.terminalId, terminalId) : eq(posSession.openedBy, authorization.userId), inArray(posSession.status, ['open', 'closing']))).orderBy(desc(posSession.openedAt)).limit(1),
    db.select({ id: branch.id, name: branch.name, code: branch.code }).from(branch).where(and(eq(branch.organizationId, orgId), branchFilter)).limit(1),
    db.select({ enabled: posPinCredential.enabled }).from(posPinCredential).where(eq(posPinCredential.userId, authorization.userId)).limit(1),
  ])
  const activeSession = sessionRows[0] ?? null
  const [terminal] = activeSession?.terminalId
    ? await db.select({ name: posTerminal.name }).from(posTerminal).where(eq(posTerminal.id, activeSession.terminalId)).limit(1)
    : []
  const [summaryRows, refundRows, movementRows, recentSales] = activeSession
    ? await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(${sale.total}),0)`, count: sql<number>`count(*)` }).from(sale).where(and(eq(sale.orgId, orgId), eq(sale.posSessionId, activeSession.id), inArray(sale.status, ['completed', 'partially_refunded', 'refunded']))),
      db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}),0)` }).from(salesReturn).where(and(eq(salesReturn.orgId, orgId), eq(salesReturn.posSessionId, activeSession.id), eq(salesReturn.status, 'completed'))),
      db.select({ count: sql<number>`count(*)` }).from(cashMovement).where(and(eq(cashMovement.orgId, orgId), eq(cashMovement.sessionId, activeSession.id))),
      db.select({ id: sale.id, receiptNo: sale.receiptNo, total: sale.total, createdAt: sale.createdAt }).from(sale).where(and(eq(sale.orgId, orgId), eq(sale.posSessionId, activeSession.id))).orderBy(desc(sale.createdAt)).limit(5),
    ])
    : [[], [], [], []]
  const locationBalances = branchRows[0]
    ? await db.select({ productId: inventoryBalance.productId, onHand: inventoryBalance.onHand, reserved: inventoryBalance.reserved, unavailable: inventoryBalance.unavailable }).from(inventoryBalance).where(and(eq(inventoryBalance.orgId, orgId), eq(inventoryBalance.branchId, branchRows[0].id)))
    : []
  const validLotBalances = branchRows[0]
    ? await db.select({ productId: inventoryLot.productId, quantity: sql<string>`coalesce(sum(${inventoryLot.quantity}), 0)` }).from(inventoryLot).where(and(
      eq(inventoryLot.orgId, orgId), eq(inventoryLot.branchId, branchRows[0].id), eq(inventoryLot.status, 'available'), gt(inventoryLot.quantity, '0'),
      or(isNull(inventoryLot.expiresAt), gt(inventoryLot.expiresAt, new Date())),
    )).groupBy(inventoryLot.productId)
    : []
  const availableByProduct = new Map(locationBalances.map((item) => [item.productId, Math.max(0, Number(item.onHand) - Number(item.reserved) - Number(item.unavailable))]))
  const validLotsByProduct = new Map(validLotBalances.map((item) => [item.productId, Number(item.quantity)]))
  const packagesByProduct = new Map<string, typeof packages>()
  for (const item of packages) packagesByProduct.set(item.productId, [...(packagesByProduct.get(item.productId) ?? []), item])
  const medicineByProduct = new Map(medicineMetadata.map((item) => [item.productId, item]))
  const eligibleProducts = filterPharmacyCatalog(products, medicineByProduct.keys(), pharmacyWorkspace)
  const branchProducts = eligibleProducts.map((item) => ({ ...item, stock: item.trackingMode === 'lot' ? validLotsByProduct.get(item.id) ?? 0 : availableByProduct.get(item.id) ?? 0, packages: packagesByProduct.get(item.id) ?? [], pharmacy: medicineByProduct.get(item.id) ?? null }))
  const eligibleCategoryIds = new Set(branchProducts.map((item) => item.categoryId).filter(Boolean))
  const posCategories = pharmacyWorkspace ? categories.filter((item) => eligibleCategoryIds.has(item.id)) : categories
  const summary = summaryRows[0], refunds = refundRows[0], movements = movementRows[0]
  return {
    products: branchProducts, categories: posCategories, customers, settings: receiptSettings(settingsRows[0]), activeBranch: branchRows[0] ?? null,
    pinSet: Boolean(pinRows[0]?.enabled),
    cashierWorkspace: { session: activeSession, registerName: terminal?.name ?? activeSession?.sessionNo ?? null, shiftSales: Number(summary?.total ?? 0) - Number(refunds?.total ?? 0), transactionCount: Number(summary?.count ?? 0), cashMovementCount: Number(movements?.count ?? 0), locationName: branchRows[0]?.name ?? 'Assigned location', recentSales },
  }
}
