import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { businessSettings, inventoryBalance, product, sale, saleItem } from '@/lib/db/schema'
import { fiscalYearLabel, fiscalYearStart } from '@/lib/finance/fiscal-year'

export interface ReportsOverview {
  period: { from: Date; to: Date; label: string }
  totals: {
    revenue: number
    transactions: number
    tax: number
    discounts: number
    averageSale: number
  }
  inventory: { cost: number; retailValue: number; products: number }
  monthly: Array<{ month: string; revenue: number; count: number }>
  payments: Array<{ method: string; amount: number; transactions: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Bounded, organization-scoped reporting data. The organization id is resolved
 * from the authenticated session by the calling server component.
 */
export async function getReportsOverview(organizationId: string, timeZone = 'Africa/Nairobi', branchIds?: readonly string[]): Promise<ReportsOverview> {
  let safeTimeZone = timeZone
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format()
  } catch {
    safeTimeZone = 'Africa/Nairobi'
  }
  const now = new Date()
  const [settings] = await db.select({ financialYearStart: businessSettings.financialYearStart })
    .from(businessSettings).where(eq(businessSettings.organizationId, organizationId)).limit(1)
  const from = fiscalYearStart(now, settings?.financialYearStart)
  const saleBranchScope = branchIds === undefined ? undefined : branchIds.length ? inArray(sale.branchId, [...branchIds]) : sql`false`
  const completed = and(eq(sale.orgId, organizationId), saleBranchScope, eq(sale.status, 'completed'), gte(sale.createdAt, from))
  const localMonth = sql`date_trunc('month', ((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}))`

  const [totalRows, monthlyRows, paymentRows, inventoryRows, topProductRows] = await Promise.all([
    db.select({
      revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
      transactions: sql<number>`count(*)`,
      tax: sql<string>`coalesce(sum(${sale.taxAmount}), 0)`,
      discounts: sql<string>`coalesce(sum(${sale.discountAmount}), 0)`,
    }).from(sale).where(completed),
    db.select({
      month: sql<string>`to_char(${localMonth}, 'YYYY-MM')`,
      revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
      count: sql<number>`count(*)`,
    }).from(sale).where(completed).groupBy(sql`1`).orderBy(sql`1`),
    db.select({
      method: sale.paymentMethod,
      amount: sql<string>`coalesce(sum(${sale.total}), 0)`,
      transactions: sql<number>`count(*)`,
    }).from(sale).where(completed).groupBy(sale.paymentMethod).orderBy(desc(sql`sum(${sale.total})`)),
    branchIds === undefined
      ? db.select({
          cost: sql<string>`coalesce(sum(${product.buyingPrice} * ${product.stock}), 0)`,
          retailValue: sql<string>`coalesce(sum(${product.sellingPrice} * ${product.stock}), 0)`,
          products: sql<number>`count(*)`,
        }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true)))
      : db.select({
          cost: sql<string>`coalesce(sum(${product.buyingPrice} * (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable})), 0)`,
          retailValue: sql<string>`coalesce(sum(${product.sellingPrice} * (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable})), 0)`,
          products: sql<number>`count(distinct ${inventoryBalance.productId})`,
        }).from(inventoryBalance).innerJoin(product, and(eq(product.id, inventoryBalance.productId), eq(product.orgId, organizationId), eq(product.isActive, true))).where(and(
          eq(inventoryBalance.orgId, organizationId),
          branchIds.length ? inArray(inventoryBalance.branchId, [...branchIds]) : sql`false`,
        )),
    db.select({
      name: saleItem.productName,
      quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
      revenue: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
    }).from(saleItem)
      .innerJoin(sale, and(eq(sale.id, saleItem.saleId), eq(sale.orgId, organizationId)))
      .where(and(eq(saleItem.orgId, organizationId), saleBranchScope, eq(sale.status, 'completed'), gte(sale.createdAt, from)))
      .groupBy(saleItem.productName)
      .orderBy(desc(sql`sum(${saleItem.totalPrice})`))
      .limit(8),
  ])

  const total = totalRows[0]
  const revenue = numeric(total?.revenue)
  const transactions = numeric(total?.transactions)
  const monthMap = new Map(monthlyRows.map((row) => [row.month, row]))
  const monthsInPeriod = (now.getUTCFullYear() - from.getUTCFullYear()) * 12 + now.getUTCMonth() - from.getUTCMonth() + 1
  const monthly = Array.from({ length: monthsInPeriod }, (_, index) => {
    const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1))
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const row = monthMap.get(key)
    return {
      month: date.toLocaleDateString('en-KE', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      revenue: numeric(row?.revenue),
      count: numeric(row?.count),
    }
  })

  return {
    period: {
      from,
      to: now,
      label: fiscalYearLabel(from, now),
    },
    totals: {
      revenue,
      transactions,
      tax: numeric(total?.tax),
      discounts: numeric(total?.discounts),
      averageSale: transactions ? revenue / transactions : 0,
    },
    inventory: {
      cost: numeric(inventoryRows[0]?.cost),
      retailValue: numeric(inventoryRows[0]?.retailValue),
      products: numeric(inventoryRows[0]?.products),
    },
    monthly,
    payments: paymentRows.map((row) => ({ method: row.method, amount: numeric(row.amount), transactions: numeric(row.transactions) })),
    topProducts: topProductRows.map((row) => ({ name: row.name, quantity: numeric(row.quantity), revenue: numeric(row.revenue) })),
  }
}
