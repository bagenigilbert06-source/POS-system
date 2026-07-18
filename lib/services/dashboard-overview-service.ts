import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, customer, expense, product, sale, saleItem } from '@/lib/db/schema'

export interface DashboardOverview {
  today: {
    revenue: number
    transactions: number
    expenses: number
    operatingPosition: number
  }
  month: {
    revenue: number
    expenses: number
    operatingPosition: number
  }
  records: {
    products: number
    customers: number
    branches: number
    lowStock: number
    outOfStock: number
    inventoryCost: number
  }
  revenueSeries: Array<{ date: string; revenue: number; expenses: number }>
  paymentMix: Array<{ method: string; amount: number; transactions: number }>
  recentSales: Array<{
    id: string
    receiptNo: string
    total: number
    paymentMethod: string
    status: string
    createdAt: Date
  }>
  lowStockProducts: Array<{
    id: string
    name: string
    sku: string | null
    stock: number
    minStock: number
  }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
}

function number(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

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
    const actualValue = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    candidate += desired - actualValue
  }
  return new Date(candidate)
}

function moveCalendarDate(year: number, month: number, day: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function calendarKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * Returns a tenant-scoped operating summary using only records Pesaby stores.
 * The organization id passed here is resolved by authenticated server routes,
 * never accepted from the browser.
 */
export async function getDashboardOverview(organizationId: string, timeZone = 'Africa/Nairobi'): Promise<DashboardOverview> {
  let safeTimeZone = timeZone
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format()
  } catch {
    safeTimeZone = 'Africa/Nairobi'
  }
  const now = new Date()
  const currentDate = localDateParts(now, safeTimeZone)
  const tomorrowDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, 1)
  const seriesStartDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, -6)
  const today = zonedMidnight(currentDate.year, currentDate.month, currentDate.day, safeTimeZone)
  const tomorrow = zonedMidnight(tomorrowDate.year, tomorrowDate.month, tomorrowDate.day, safeTimeZone)
  const monthStart = zonedMidnight(currentDate.year, currentDate.month, 1, safeTimeZone)
  const seriesStart = zonedMidnight(seriesStartDate.year, seriesStartDate.month, seriesStartDate.day, safeTimeZone)
  const saleLocalDate = sql`((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone})::date`
  const expenseLocalDate = sql`((${expense.createdAt} at time zone 'UTC') at time zone ${safeTimeZone})::date`

  const completedSale = and(eq(sale.orgId, organizationId), eq(sale.status, 'completed'))

  const [
    todaySalesRows,
    todayExpenseRows,
    monthSalesRows,
    monthExpenseRows,
    recordRows,
    revenueRows,
    expenseRows,
    paymentRows,
    recentRows,
    lowStockRows,
    topProductRows,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, today), lte(sale.createdAt, tomorrow))),
    db
      .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), gte(expense.createdAt, today), lte(expense.createdAt, tomorrow))),
    db
      .select({ revenue: sql<string>`coalesce(sum(${sale.total}), 0)` })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, monthStart))),
    db
      .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), gte(expense.createdAt, monthStart))),
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true))),
      db.select({ count: sql<number>`count(*)` }).from(customer).where(eq(customer.orgId, organizationId)),
      db.select({ count: sql<number>`count(*)` }).from(branch).where(eq(branch.organizationId, organizationId)),
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true), sql`${product.stock} <= ${product.minStock}`)),
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true), lte(product.stock, 0))),
      db.select({ value: sql<string>`coalesce(sum(${product.buyingPrice} * ${product.stock}), 0)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true))),
    ]),
    db
      .select({
        date: sql<string>`to_char(${saleLocalDate}, 'YYYY-MM-DD')`,
        amount: sql<string>`coalesce(sum(${sale.total}), 0)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, seriesStart)))
      .groupBy(sql.raw('1'))
      .orderBy(asc(sql.raw('1'))),
    db
      .select({
        date: sql<string>`to_char(${expenseLocalDate}, 'YYYY-MM-DD')`,
        amount: sql<string>`coalesce(sum(${expense.amount}), 0)`,
      })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), gte(expense.createdAt, seriesStart)))
      .groupBy(sql.raw('1'))
      .orderBy(asc(sql.raw('1'))),
    db
      .select({
        method: sale.paymentMethod,
        amount: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, monthStart)))
      .groupBy(sale.paymentMethod)
      .orderBy(desc(sql`sum(${sale.total})`)),
    db
      .select({
        id: sale.id,
        receiptNo: sale.receiptNo,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt,
      })
      .from(sale)
      .where(eq(sale.orgId, organizationId))
      .orderBy(desc(sale.createdAt))
      .limit(6),
    db
      .select({ id: product.id, name: product.name, sku: product.sku, stock: product.stock, minStock: product.minStock })
      .from(product)
      .where(and(eq(product.orgId, organizationId), eq(product.isActive, true), sql`${product.stock} <= ${product.minStock}`))
      .orderBy(asc(product.stock))
      .limit(6),
    db
      .select({
        name: saleItem.productName,
        quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
        revenue: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, and(eq(sale.id, saleItem.saleId), eq(sale.orgId, organizationId), eq(sale.status, 'completed')))
      .where(and(eq(saleItem.orgId, organizationId), gte(sale.createdAt, monthStart)))
      .groupBy(saleItem.productName)
      .orderBy(desc(sql`sum(${saleItem.totalPrice})`))
      .limit(5),
  ])

  const todayRevenue = number(todaySalesRows[0]?.revenue)
  const todayExpenses = number(todayExpenseRows[0]?.amount)
  const monthRevenue = number(monthSalesRows[0]?.revenue)
  const monthExpenses = number(monthExpenseRows[0]?.amount)
  const [products, customers, branches, lowStock, outOfStock, inventoryCost] = recordRows

  const revenueByDate = new Map(revenueRows.map((row) => [row.date, number(row.amount)]))
  const expensesByDate = new Map(expenseRows.map((row) => [row.date, number(row.amount)]))
  const revenueSeries = Array.from({ length: 7 }, (_, index) => {
    const key = calendarKey(moveCalendarDate(seriesStartDate.year, seriesStartDate.month, seriesStartDate.day, index))
    return { date: key, revenue: revenueByDate.get(key) ?? 0, expenses: expensesByDate.get(key) ?? 0 }
  })

  return {
    today: {
      revenue: todayRevenue,
      transactions: number(todaySalesRows[0]?.transactions),
      expenses: todayExpenses,
      operatingPosition: todayRevenue - todayExpenses,
    },
    month: {
      revenue: monthRevenue,
      expenses: monthExpenses,
      operatingPosition: monthRevenue - monthExpenses,
    },
    records: {
      products: number(products[0]?.count),
      customers: number(customers[0]?.count),
      branches: number(branches[0]?.count),
      lowStock: number(lowStock[0]?.count),
      outOfStock: number(outOfStock[0]?.count),
      inventoryCost: number(inventoryCost[0]?.value),
    },
    revenueSeries,
    paymentMix: paymentRows.map((row) => ({ method: row.method, amount: number(row.amount), transactions: number(row.transactions) })),
    recentSales: recentRows.map((row) => ({ ...row, total: number(row.total) })),
    lowStockProducts: lowStockRows,
    topProducts: topProductRows.map((row) => ({ name: row.name, quantity: number(row.quantity), revenue: number(row.revenue) })),
  }
}
