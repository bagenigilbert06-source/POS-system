import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, category, customer, expense, inventoryBalance, inventoryLot, invoice, organizationMembership, product, purchase, sale, saleItem, salesReturn, salesReturnItem } from '@/lib/db/schema'

export interface DashboardOverview {
  today: {
    revenue: number
    transactions: number
    expenses: number
    operatingPosition: number
    grossProfit: number | null
    profitMargin: number | null
    costDataComplete: boolean
  }
  previousDay: {
    revenue: number
    transactions: number
    grossProfit: number | null
  }
  month: {
    revenue: number
    expenses: number
    operatingPosition: number
  }
  allTime: {
    revenue: number
    expenses: number
    operatingPosition: number
    transactions: number
  }
  records: {
    products: number
    customers: number
    branches: number
    staff: number
    lowStock: number
    outOfStock: number
    inventoryCost: number
  }
  revenueSeries: Array<{ date: string; revenue: number; expenses: number }>
  monthlySalesSeries: Array<{ month: string; revenue: number; expenses: number }>
  salesPerformanceSeries: Array<{ date: string; revenue: number; transactions: number }>
  paymentMix: Array<{ method: string; amount: number; transactions: number }>
  reportDate: string
  hourlySales: Array<{ date: string; hour: number; revenue: number; transactions: number }>
  productSales: Array<{
    date: string
    productId: string
    name: string
    imageUrl: string | null
    quantity: number
    revenue: number
  }>
  recentSales: Array<{
    id: string
    receiptNo: string
    customerName: string | null
    productName: string | null
    imageUrl: string | null
    categoryName: string | null
    total: number
    paymentMethod: string
    status: string
    createdAt: Date
  }>
  recentPurchases: Array<{ id: string; name: string; reference: string; date: Date; status: string; amount: number }>
  recentExpenses: Array<{ id: string; name: string; reference: string; date: Date; status: string; amount: number }>
  recentInvoices: Array<{ id: string; name: string; reference: string; date: Date; status: string; amount: number }>
  lowStockProducts: Array<{
    id: string
    name: string
    sku: string | null
    imageUrl: string | null
    stock: number
    minStock: number
  }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topCustomers: Array<{ id: string; name: string; location: string; orders: number; total: number }>
  topCategories: Array<{ id: string; name: string; sales: number }>
  topCategoriesLast7Days: Array<{ id: string; name: string; sales: number }>
  categoryCount: number
  liquorCompliance: {
    verifiedToday: number
    unverifiedToday: number
  }
  pharmacyInventory: {
    expiringSoon: number
    expired: number
    valueAtRisk: number
  }
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
export async function getDashboardOverview(organizationId: string, timeZone = 'Africa/Nairobi', branchIds?: readonly string[]): Promise<DashboardOverview> {
  let safeTimeZone = timeZone
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format()
  } catch {
    safeTimeZone = 'Africa/Nairobi'
  }
  const now = new Date()
  const currentDate = localDateParts(now, safeTimeZone)
  const tomorrowDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, 1)
  const seriesStartDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, -29)
  const last7DaysStartDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, -6)
  const yesterdayDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, -1)
  const performanceStartDate = moveCalendarDate(currentDate.year, currentDate.month, currentDate.day, -61)
  const today = zonedMidnight(currentDate.year, currentDate.month, currentDate.day, safeTimeZone)
  const yesterdayStart = zonedMidnight(yesterdayDate.year, yesterdayDate.month, yesterdayDate.day, safeTimeZone)
  const tomorrow = zonedMidnight(tomorrowDate.year, tomorrowDate.month, tomorrowDate.day, safeTimeZone)
  const monthStart = zonedMidnight(currentDate.year, currentDate.month, 1, safeTimeZone)
  const seriesStart = zonedMidnight(seriesStartDate.year, seriesStartDate.month, seriesStartDate.day, safeTimeZone)
  const last7DaysStart = zonedMidnight(last7DaysStartDate.year, last7DaysStartDate.month, last7DaysStartDate.day, safeTimeZone)
  const performanceStart = zonedMidnight(performanceStartDate.year, performanceStartDate.month, performanceStartDate.day, safeTimeZone)
  // PostgreSQL has both text and interval overloads for `AT TIME ZONE`.
  // Cast the bound zone explicitly so prepared statements resolve reliably.
  const saleLocalDate = sql`((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}::text)::date`
  const saleLocalTimestamp = sql`((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}::text)`
  const expenseLocalDate = sql`((${expense.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}::text)::date`

  const saleBranchScope = branchIds === undefined
    ? undefined
    : branchIds.length ? inArray(sale.branchId, [...branchIds]) : sql`false`
  const expenseBranchScope = branchIds === undefined
    ? undefined
    : branchIds.length ? inArray(expense.branchId, [...branchIds]) : sql`false`
  const completedSale = and(eq(sale.orgId, organizationId), eq(sale.status, 'completed'), saleBranchScope)
  const paidSale = and(eq(sale.orgId, organizationId), inArray(sale.status, ['completed', 'partially_refunded', 'refunded']), saleBranchScope)

  const [
    todaySalesRows,
    yesterdaySalesRows,
    todayExpenseRows,
    monthSalesRows,
    monthExpenseRows,
    allTimeSalesRows,
    allTimeExpenseRows,
    recordRows,
    revenueRows,
    expenseRows,
    paymentRows,
    hourlyRows,
    recentCostRows,
    productSalesRows,
    productRefundRows,
    hourlyRefundRows,
    recentRows,
    lowStockRows,
    topProductRows,
    complianceRows,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, today), lt(sale.createdAt, tomorrow))),
    db
      .select({
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, yesterdayStart), lt(sale.createdAt, today))),
    db
      .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), expenseBranchScope, gte(expense.createdAt, today), lt(expense.createdAt, tomorrow))),
    db
      .select({ revenue: sql<string>`coalesce(sum(${sale.total}), 0)` })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, monthStart))),
    db
      .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), expenseBranchScope, gte(expense.createdAt, monthStart))),
    db
      .select({
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(completedSale),
    db
      .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), expenseBranchScope)),
    Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true))),
      db.select({ count: sql<number>`count(*)` }).from(customer).where(eq(customer.orgId, organizationId)),
      db.select({ count: sql<number>`count(*)` }).from(branch).where(and(eq(branch.organizationId, organizationId), branchIds === undefined ? undefined : branchIds.length ? inArray(branch.id, [...branchIds]) : sql`false`)),
      db.select({ count: sql<number>`count(*)` }).from(organizationMembership).where(eq(organizationMembership.organizationId, organizationId)),
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true), sql`${product.stock} <= ${product.minStock}`)),
      db.select({ count: sql<number>`count(*)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true), lte(product.stock, 0))),
      db.select({ value: sql<string>`coalesce(sum(${product.buyingPrice} * ${product.stock}), 0)` }).from(product).where(and(eq(product.orgId, organizationId), eq(product.isActive, true))),
    ]),
    db
      .select({
        date: sql<string>`to_char(${saleLocalDate}, 'YYYY-MM-DD')`,
        amount: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, performanceStart)))
      .groupBy(sql.raw('1'))
      .orderBy(asc(sql.raw('1'))),
    db
      .select({
        date: sql<string>`to_char(${expenseLocalDate}, 'YYYY-MM-DD')`,
        amount: sql<string>`coalesce(sum(${expense.amount}), 0)`,
      })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), expenseBranchScope, gte(expense.createdAt, seriesStart)))
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
        date: sql<string>`to_char(${saleLocalTimestamp}, 'YYYY-MM-DD')`,
        hour: sql<number>`extract(hour from ${saleLocalTimestamp})::int`,
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        transactions: sql<number>`count(*)`,
      })
      .from(sale)
      .where(and(paidSale, gte(sale.createdAt, seriesStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1'), sql.raw('2'))
      .orderBy(asc(sql.raw('1')), asc(sql.raw('2'))),
    db
      .select({
        date: sql<string>`to_char(${saleLocalDate}, 'YYYY-MM-DD')`,
        cost: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)`,
        missingCosts: sql<number>`count(*) filter (where ${saleItem.totalPrice} > 0 and ${saleItem.totalCost} <= 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(and(completedSale, eq(saleItem.orgId, organizationId), gte(sale.createdAt, yesterdayStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1')),
    db
      .select({
        date: sql<string>`to_char(${saleLocalDate}, 'YYYY-MM-DD')`,
        productId: saleItem.productId,
        name: saleItem.productName,
        imageUrl: product.imageUrl,
        quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
        revenue: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .leftJoin(product, and(eq(product.id, saleItem.productId), eq(product.orgId, organizationId)))
      .where(and(paidSale, eq(saleItem.orgId, organizationId), gte(sale.createdAt, seriesStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1'), saleItem.productId, saleItem.productName, product.imageUrl)
      .orderBy(asc(sql.raw('1'))),
    db
      .select({
        date: sql<string>`to_char(${saleLocalDate}, 'YYYY-MM-DD')`,
        productId: salesReturnItem.productId,
        quantity: sql<number>`coalesce(sum(${salesReturnItem.quantity}), 0)`,
        revenue: sql<string>`coalesce(sum(${salesReturnItem.total}), 0)`,
      })
      .from(salesReturnItem)
      .innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId))
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .where(and(paidSale, eq(salesReturn.orgId, organizationId), eq(salesReturn.status, 'completed'), eq(salesReturnItem.orgId, organizationId), gte(sale.createdAt, seriesStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1'), salesReturnItem.productId)
      .orderBy(asc(sql.raw('1'))),
    db
      .select({
        date: sql<string>`to_char(${saleLocalTimestamp}, 'YYYY-MM-DD')`,
        hour: sql<number>`extract(hour from ${saleLocalTimestamp})::int`,
        amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
      })
      .from(salesReturn)
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .where(and(paidSale, eq(salesReturn.orgId, organizationId), eq(salesReturn.status, 'completed'), gte(sale.createdAt, seriesStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1'), sql.raw('2'))
      .orderBy(asc(sql.raw('1')), asc(sql.raw('2'))),
    db
      .select({
        id: sale.id,
        receiptNo: sale.receiptNo,
        customerName: customer.name,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt,
      })
      .from(sale)
      .leftJoin(customer, and(eq(customer.id, sale.customerId), eq(customer.orgId, organizationId)))
      .where(and(eq(sale.orgId, organizationId), saleBranchScope))
      .orderBy(desc(sale.createdAt))
      .limit(6),
    db
      .select({ id: product.id, name: product.name, sku: product.sku, imageUrl: product.imageUrl, stock: product.stock, minStock: product.minStock })
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
      .where(and(eq(saleItem.orgId, organizationId), saleBranchScope, gte(sale.createdAt, monthStart)))
      .groupBy(saleItem.productName)
      .orderBy(desc(sql`sum(${saleItem.totalPrice})`))
      .limit(5),
    db
      .select({
        verified: sql<number>`count(*) filter (where ${sale.ageVerified} = true)`,
        unverified: sql<number>`count(*) filter (where ${sale.ageVerified} = false)`,
      })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, today), lt(sale.createdAt, tomorrow))),
  ])

  const recentSaleItems = recentRows.length ? await db
    .select({
      saleId: saleItem.saleId,
      productName: saleItem.productName,
      imageUrl: product.imageUrl,
      categoryName: category.name,
    })
    .from(saleItem)
    .leftJoin(product, and(eq(product.id, saleItem.productId), eq(product.orgId, organizationId)))
    .leftJoin(category, and(eq(category.id, product.categoryId), eq(category.orgId, organizationId)))
    .where(and(eq(saleItem.orgId, organizationId), inArray(saleItem.saleId, recentRows.map((row) => row.id))))
    .orderBy(asc(saleItem.id)) : []
  const recentProductBySale = new Map<string, (typeof recentSaleItems)[number]>()
  for (const item of recentSaleItems) if (!recentProductBySale.has(item.saleId)) recentProductBySale.set(item.saleId, item)

  const yearStart = zonedMidnight(currentDate.year, 1, 1, safeTimeZone)
  const [monthlyRevenueRows, monthlyExpenseRows] = await Promise.all([
    db.select({ month: sql<number>`extract(month from ${saleLocalTimestamp})::int`, amount: sql<string>`coalesce(sum(${sale.total}), 0)` })
      .from(sale)
      .where(and(completedSale, gte(sale.createdAt, yearStart), lt(sale.createdAt, tomorrow)))
      .groupBy(sql.raw('1')),
    db.select({ month: sql<number>`extract(month from ((${expense.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}::text))::int`, amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
      .from(expense)
      .where(and(eq(expense.orgId, organizationId), expenseBranchScope, gte(expense.createdAt, yearStart), lt(expense.createdAt, tomorrow)))
      .groupBy(sql.raw('1')),
  ])
  const revenueByMonth = new Map(monthlyRevenueRows.map((row) => [number(row.month), number(row.amount)]))
  const expenseByMonth = new Map(monthlyExpenseRows.map((row) => [number(row.month), number(row.amount)]))
  const purchaseBranchScope = branchIds === undefined ? undefined : branchIds.length ? inArray(purchase.branchId, [...branchIds]) : sql`false`
  const [recentPurchaseRows, recentExpenseRows, recentInvoiceRows, topCustomerRows, topCategoryRows, topCategoryRowsLast7Days, categoryCountRows] = await Promise.all([
    db.select({ id: purchase.id, name: purchase.supplierName, reference: purchase.purchaseNo, date: purchase.createdAt, status: purchase.paymentStatus, amount: purchase.total })
      .from(purchase).where(and(eq(purchase.orgId, organizationId), purchaseBranchScope)).orderBy(desc(purchase.createdAt)).limit(5),
    db.select({ id: expense.id, name: expense.title, reference: expense.reference, date: expense.expenseDate, status: expense.paymentMethod, amount: expense.amount })
      .from(expense).where(and(eq(expense.orgId, organizationId), expenseBranchScope)).orderBy(desc(expense.expenseDate)).limit(5),
    db.select({ id: invoice.id, name: customer.name, reference: invoice.invoiceNo, date: invoice.dueDate, createdAt: invoice.createdAt, status: invoice.status, amount: invoice.total })
      .from(invoice).leftJoin(customer, and(eq(customer.id, invoice.customerId), eq(customer.orgId, organizationId))).where(eq(invoice.orgId, organizationId)).orderBy(desc(invoice.createdAt)).limit(5),
    db.select({ id: customer.id, name: customer.name, location: customer.address, orders: sql<number>`count(${sale.id})`, total: sql<string>`coalesce(sum(${sale.total}), 0)` })
      .from(sale).innerJoin(customer, and(eq(customer.id, sale.customerId), eq(customer.orgId, organizationId))).where(paidSale).groupBy(customer.id, customer.name, customer.address).orderBy(desc(sql`sum(${sale.total})`)).limit(5),
    db.select({ id: category.id, name: category.name, sales: sql<number>`coalesce(sum(${saleItem.quantity}), 0)` })
      .from(saleItem).innerJoin(sale, and(eq(sale.id, saleItem.saleId), paidSale)).innerJoin(product, and(eq(product.id, saleItem.productId), eq(product.orgId, organizationId))).innerJoin(category, and(eq(category.id, product.categoryId), eq(category.orgId, organizationId))).where(and(eq(saleItem.orgId, organizationId), gte(sale.createdAt, seriesStart))).groupBy(category.id, category.name).orderBy(desc(sql`sum(${saleItem.quantity})`)).limit(3),
    db.select({ id: category.id, name: category.name, sales: sql<number>`coalesce(sum(${saleItem.quantity}), 0)` })
      .from(saleItem).innerJoin(sale, and(eq(sale.id, saleItem.saleId), paidSale)).innerJoin(product, and(eq(product.id, saleItem.productId), eq(product.orgId, organizationId))).innerJoin(category, and(eq(category.id, product.categoryId), eq(category.orgId, organizationId))).where(and(eq(saleItem.orgId, organizationId), gte(sale.createdAt, last7DaysStart))).groupBy(category.id, category.name).orderBy(desc(sql`sum(${saleItem.quantity})`)).limit(3),
    db.select({ count: sql<number>`count(*)` }).from(category).where(and(eq(category.orgId, organizationId), eq(category.isActive, true))),
  ])

  const todayRevenue = number(todaySalesRows[0]?.revenue)
  const todayExpenses = number(todayExpenseRows[0]?.amount)
  const monthRevenue = number(monthSalesRows[0]?.revenue)
  const monthExpenses = number(monthExpenseRows[0]?.amount)
  const allTimeRevenue = number(allTimeSalesRows[0]?.revenue)
  const allTimeExpenses = number(allTimeExpenseRows[0]?.amount)
  const [products, customers, branches, staff, lowStock, outOfStock, inventoryCost] = recordRows
  const expiryLimit = new Date(now.getTime() + 90 * 86_400_000)
  const lotBranchScope = branchIds === undefined ? undefined : branchIds.length ? inArray(inventoryLot.branchId, [...branchIds]) : sql`false`
  const [pharmacyInventoryRows] = await db.select({
    expiringSoon: sql<number>`count(*) filter (where ${inventoryLot.expiresAt} >= ${now} and ${inventoryLot.expiresAt} <= ${expiryLimit} and ${inventoryLot.quantity} > 0)`,
    expired: sql<number>`count(*) filter (where ${inventoryLot.expiresAt} < ${now} and ${inventoryLot.quantity} > 0)`,
    valueAtRisk: sql<string>`coalesce(sum(case when ${inventoryLot.expiresAt} <= ${expiryLimit} and ${inventoryLot.quantity} > 0 then ${inventoryLot.quantity} * ${inventoryLot.unitCost} else 0 end), 0)`,
  }).from(inventoryLot).where(and(eq(inventoryLot.orgId, organizationId), lotBranchScope))
  const branchInventoryRows = branchIds === undefined || branchIds.length === 0 ? [] : await db
    .select({
      id: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      stock: sql<string>`coalesce(sum(${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}), 0)`,
      minStock: sql<string>`coalesce(sum(coalesce(${inventoryBalance.reorderPoint}, ${product.minStock})), 0)`,
      buyingPrice: product.buyingPrice,
    })
    .from(inventoryBalance)
    .innerJoin(product, and(eq(product.id, inventoryBalance.productId), eq(product.orgId, organizationId), eq(product.isActive, true)))
    .where(and(eq(inventoryBalance.orgId, organizationId), inArray(inventoryBalance.branchId, [...branchIds])))
    .groupBy(product.id, product.name, product.sku, product.imageUrl, product.buyingPrice)
  const scopedInventory = branchIds === undefined ? null : branchInventoryRows.map((row) => ({
    id: row.id, name: row.name, sku: row.sku, imageUrl: row.imageUrl, stock: number(row.stock), minStock: number(row.minStock), buyingPrice: number(row.buyingPrice),
  }))
  const scopedLowStock = scopedInventory?.filter((row) => row.stock <= row.minStock).sort((a, b) => a.stock - b.stock) ?? null

  const salesByDate = new Map(revenueRows.map((row) => [row.date, { revenue: number(row.amount), transactions: number(row.transactions) }]))
  const expensesByDate = new Map(expenseRows.map((row) => [row.date, number(row.amount)]))
  const revenueSeries = Array.from({ length: 30 }, (_, index) => {
    const key = calendarKey(moveCalendarDate(seriesStartDate.year, seriesStartDate.month, seriesStartDate.day, index))
    return { date: key, revenue: salesByDate.get(key)?.revenue ?? 0, expenses: expensesByDate.get(key) ?? 0 }
  })
  const salesPerformanceSeries = Array.from({ length: 62 }, (_, index) => {
    const key = calendarKey(moveCalendarDate(performanceStartDate.year, performanceStartDate.month, performanceStartDate.day, index))
    return { date: key, revenue: salesByDate.get(key)?.revenue ?? 0, transactions: salesByDate.get(key)?.transactions ?? 0 }
  })
  const refundsByHour = new Map(hourlyRefundRows.map((row) => [`${row.date}:${number(row.hour)}`, number(row.amount)]))
  const costsByDate = new Map(recentCostRows.map((row) => [row.date, { cost: number(row.cost), missingCosts: number(row.missingCosts) }]))
  const todayCosts = costsByDate.get(calendarKey(currentDate)) ?? { cost: 0, missingCosts: 0 }
  const yesterdayCosts = costsByDate.get(calendarKey(yesterdayDate)) ?? { cost: 0, missingCosts: 0 }
  const yesterdayRevenue = number(yesterdaySalesRows[0]?.revenue)
  const todayCostDataComplete = todayCosts.missingCosts === 0
  const yesterdayCostDataComplete = yesterdayCosts.missingCosts === 0
  const productRefunds = new Map(productRefundRows.map((row) => [`${row.date}:${row.productId}`, { quantity: number(row.quantity), revenue: number(row.revenue) }]))

  return {
    today: {
      revenue: todayRevenue,
      transactions: number(todaySalesRows[0]?.transactions),
      expenses: todayExpenses,
      operatingPosition: todayRevenue - todayExpenses,
      grossProfit: todayCostDataComplete ? todayRevenue - todayCosts.cost : null,
      profitMargin: todayCostDataComplete && todayRevenue > 0 ? ((todayRevenue - todayCosts.cost) / todayRevenue) * 100 : null,
      costDataComplete: todayCostDataComplete,
    },
    previousDay: {
      revenue: yesterdayRevenue,
      transactions: number(yesterdaySalesRows[0]?.transactions),
      grossProfit: yesterdayCostDataComplete ? yesterdayRevenue - yesterdayCosts.cost : null,
    },
    month: {
      revenue: monthRevenue,
      expenses: monthExpenses,
      operatingPosition: monthRevenue - monthExpenses,
    },
    allTime: {
      revenue: allTimeRevenue,
      expenses: allTimeExpenses,
      operatingPosition: allTimeRevenue - allTimeExpenses,
      transactions: number(allTimeSalesRows[0]?.transactions),
    },
    records: {
      products: scopedInventory ? scopedInventory.length : number(products[0]?.count),
      customers: number(customers[0]?.count),
      branches: number(branches[0]?.count),
      staff: number(staff[0]?.count),
      lowStock: scopedLowStock ? scopedLowStock.length : number(lowStock[0]?.count),
      outOfStock: scopedInventory ? scopedInventory.filter((row) => row.stock <= 0).length : number(outOfStock[0]?.count),
      inventoryCost: scopedInventory ? scopedInventory.reduce((sum, row) => sum + row.stock * row.buyingPrice, 0) : number(inventoryCost[0]?.value),
    },
    revenueSeries,
    monthlySalesSeries: Array.from({ length: 12 }, (_, index) => ({
      month: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(Date.UTC(2020, index, 1))),
      revenue: revenueByMonth.get(index + 1) ?? 0,
      expenses: expenseByMonth.get(index + 1) ?? 0,
    })),
    salesPerformanceSeries,
    paymentMix: paymentRows.map((row) => ({ method: row.method, amount: number(row.amount), transactions: number(row.transactions) })),
    reportDate: calendarKey(currentDate),
    hourlySales: hourlyRows.map((row) => {
      const hour = number(row.hour)
      return { date: row.date, hour, revenue: Math.max(0, number(row.revenue) - (refundsByHour.get(`${row.date}:${hour}`) ?? 0)), transactions: number(row.transactions) }
    }),
    productSales: productSalesRows.map((row) => {
      const refund = productRefunds.get(`${row.date}:${row.productId}`)
      return {
        date: row.date,
        productId: row.productId,
        name: row.name,
        imageUrl: row.imageUrl,
        quantity: Math.max(0, number(row.quantity) - (refund?.quantity ?? 0)),
        revenue: Math.max(0, number(row.revenue) - (refund?.revenue ?? 0)),
      }
    }),
    recentSales: recentRows.map((row) => {
      const item = recentProductBySale.get(row.id)
      return { ...row, productName: item?.productName ?? null, imageUrl: item?.imageUrl ?? null, categoryName: item?.categoryName ?? null, total: number(row.total) }
    }),
    recentPurchases: recentPurchaseRows.map((row) => ({ ...row, amount: number(row.amount) })),
    recentExpenses: recentExpenseRows.map((row) => ({ ...row, reference: row.reference ?? row.id.slice(0, 8).toUpperCase(), amount: number(row.amount) })),
    recentInvoices: recentInvoiceRows.map((row) => ({ id: row.id, name: row.name ?? 'Walk-in customer', reference: row.reference, date: row.date ?? row.createdAt, status: row.status, amount: number(row.amount) })),
    topCustomers: topCustomerRows.map((row) => ({ id: row.id, name: row.name, location: row.location ?? 'Local customer', orders: number(row.orders), total: number(row.total) })),
    topCategories: topCategoryRows.map((row) => ({ id: row.id, name: row.name, sales: number(row.sales) })),
    topCategoriesLast7Days: topCategoryRowsLast7Days.map((row) => ({ id: row.id, name: row.name, sales: number(row.sales) })),
    categoryCount: number(categoryCountRows[0]?.count),
    lowStockProducts: scopedLowStock ? scopedLowStock.slice(0, 6).map((row) => ({ id: row.id, name: row.name, sku: row.sku, imageUrl: row.imageUrl, stock: row.stock, minStock: row.minStock })) : lowStockRows,
    topProducts: topProductRows.map((row) => ({ name: row.name, quantity: number(row.quantity), revenue: number(row.revenue) })),
    liquorCompliance: {
      verifiedToday: number(complianceRows[0]?.verified),
      unverifiedToday: number(complianceRows[0]?.unverified),
    },
    pharmacyInventory: {
      expiringSoon: number(pharmacyInventoryRows?.expiringSoon),
      expired: number(pharmacyInventoryRows?.expired),
      valueAtRisk: number(pharmacyInventoryRows?.valueAtRisk),
    },
  }
}
