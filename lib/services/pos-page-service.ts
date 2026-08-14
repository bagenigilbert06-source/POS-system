import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, businessSettings, category, customer, inventoryBalance, posPinCredential, posSession, product, sale, salesReturn } from '@/lib/db/schema'
import { readThroughRedis } from '@/lib/cache/redis-cache'
import type { AuthorizationContext } from '@/lib/auth/authorization'

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
  }
}

/** Complete first-render POS model. Authentication is resolved by the page once;
 * every read below is scoped with that trusted organization context. */
export async function getPosPageData(authorization: AuthorizationContext, includeCustomers: boolean) {
  const orgId = authorization.organizationId
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const branchFilter = authorization.isOrganizationWide
    ? eq(branch.isMain, true)
    : eq(branch.id, authorization.branchIds[0] ?? '')

  const [products, categories, customers, settingsRows, sessionRows, summaryRows, refundRows, recentSales, branchRows, pinRows] = await Promise.all([
    readThroughRedis({ namespace: 'products', organizationId: orgId, variant: 'list:active:', ttlSeconds: 120, load: () => db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(desc(product.createdAt)) }),
    readThroughRedis({ namespace: 'categories', organizationId: orgId, variant: 'pos-filter-list', ttlSeconds: 600, load: () => db.select({ id: category.id, name: category.name, parentCategoryId: category.parentCategoryId, isActive: category.isActive }).from(category).where(eq(category.orgId, orgId)).orderBy(category.name) }),
    includeCustomers ? db.select().from(customer).where(eq(customer.orgId, orgId)).orderBy(desc(customer.createdAt)) : Promise.resolve([]),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1),
    db.select().from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, authorization.userId), eq(posSession.status, 'open'))).orderBy(desc(posSession.openedAt)).limit(1),
    db.select({ total: sql<string>`coalesce(sum(${sale.total}),0)`, count: sql<number>`count(*)` }).from(sale).where(and(eq(sale.orgId, orgId), eq(sale.userId, authorization.userId), inArray(sale.status, ['completed', 'partially_refunded', 'refunded']), gte(sale.createdAt, today))),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}),0)` }).from(salesReturn).where(and(eq(salesReturn.orgId, orgId), eq(salesReturn.userId, authorization.userId), eq(salesReturn.status, 'completed'), gte(salesReturn.createdAt, today))),
    db.select({ id: sale.id, receiptNo: sale.receiptNo, total: sale.total, createdAt: sale.createdAt }).from(sale).where(and(eq(sale.orgId, orgId), eq(sale.userId, authorization.userId))).orderBy(desc(sale.createdAt)).limit(5),
    db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), branchFilter)).limit(1),
    db.select({ enabled: posPinCredential.enabled }).from(posPinCredential).where(eq(posPinCredential.userId, authorization.userId)).limit(1),
  ])
  const locationBalances = branchRows[0]
    ? await db.select({ productId: inventoryBalance.productId, onHand: inventoryBalance.onHand, reserved: inventoryBalance.reserved, unavailable: inventoryBalance.unavailable }).from(inventoryBalance).where(and(eq(inventoryBalance.orgId, orgId), eq(inventoryBalance.branchId, branchRows[0].id)))
    : []
  const availableByProduct = new Map(locationBalances.map((item) => [item.productId, Math.max(0, Number(item.onHand) - Number(item.reserved) - Number(item.unavailable))]))
  const branchProducts = products.map((item) => ({ ...item, stock: availableByProduct.get(item.id) ?? 0 }))
  const summary = summaryRows[0], refunds = refundRows[0]
  return {
    products: branchProducts, categories, customers, settings: receiptSettings(settingsRows[0]), activeBranch: branchRows[0] ?? null,
    pinSet: Boolean(pinRows[0]?.enabled),
    cashierWorkspace: { session: sessionRows[0] ?? null, todaySales: Number(summary?.total ?? 0) - Number(refunds?.total ?? 0), transactionCount: Number(summary?.count ?? 0), recentSales },
  }
}
