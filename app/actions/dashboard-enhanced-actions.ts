'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { OrganizationService } from '@/lib/services/organization-service'
import { 
  sale, 
  saleItem, 
  expense, 
  customer, 
  product, 
  stockMovement, 
  purchase,
  creditSale,
  creditPayment
} from '@/lib/db/schema'
import { and, eq, gte, lte, sql, desc, sum as dbSum } from 'drizzle-orm'
import Decimal from 'decimal.js'

// Helper to get current user's organization
async function getUserOrganization() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization found')
  return organization
}

// ===== SALES DASHBOARD =====
export async function getSalesDashboardData(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  const [salesByHour, salesByCategory, topProducts, salesByPayment] = await Promise.all([
    // Sales by hour
    db
      .select({
        hour: sql`EXTRACT(HOUR FROM ${sale.createdAt})`,
        count: dbSum(sql`1`),
        total: dbSum(sale.total),
      })
      .from(sale)
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${sale.createdAt})`)
      .then(rows => rows.map(r => ({
        hour: String(r.hour || 0).padStart(2, '0') + ':00',
        transactions: Number(r.count || 0),
        revenue: new Decimal(r.total || 0).toNumber()
      }))),
    
    // Sales by category
    db
      .select({
        category: product.categoryId,
        categoryName: sql`(SELECT name FROM category WHERE id = ${product.categoryId} LIMIT 1)`,
        revenue: dbSum(saleItem.totalPrice),
        quantity: dbSum(saleItem.quantity),
      })
      .from(saleItem)
      .innerJoin(product, eq(saleItem.productId, product.id))
      .innerJoin(sale, eq(saleItem.saleId, sale.id))
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(product.categoryId)
      .then(rows => rows.map(r => ({
        category: r.categoryName as string || 'Uncategorized',
        revenue: new Decimal(r.revenue || 0).toNumber(),
        quantity: Number(r.quantity || 0)
      }))),
    
    // Top 10 products
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        revenue: dbSum(saleItem.totalPrice),
        quantity: dbSum(saleItem.quantity),
        unitPrice: sql`AVG(${saleItem.unitPrice})`,
      })
      .from(saleItem)
      .innerJoin(product, eq(saleItem.productId, product.id))
      .innerJoin(sale, eq(saleItem.saleId, sale.id))
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(product.id)
      .orderBy(desc(dbSum(saleItem.totalPrice)))
      .limit(10)
      .then(rows => rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku || 'N/A',
        revenue: new Decimal(r.revenue || 0).toNumber(),
        quantity: Number(r.quantity || 0),
        unitPrice: new Decimal(r.unitPrice || 0).toNumber()
      }))),
    
    // Sales by payment method
    db
      .select({
        method: sale.paymentMethod,
        count: dbSum(sql`1`),
        total: dbSum(sale.total),
      })
      .from(sale)
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(sale.paymentMethod)
      .then(rows => rows.map(r => ({
        method: r.method || 'cash',
        transactions: Number(r.count || 0),
        amount: new Decimal(r.total || 0).toNumber()
      })))
  ])

  return {
    salesByHour,
    salesByCategory,
    topProducts,
    salesByPayment
  }
}

// ===== EXPENSE DASHBOARD =====
export async function getExpenseDashboardData(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  const [expenseByCategory, expenseTrends, topExpenses] = await Promise.all([
    // Expenses by category
    db
      .select({
        category: expense.category,
        count: dbSum(sql`1`),
        total: dbSum(expense.amount),
      })
      .from(expense)
      .where(and(
        eq(expense.orgId, org.id),
        gte(expense.createdAt, dateFrom),
        lte(expense.createdAt, dateTo)
      ))
      .groupBy(expense.category)
      .then(rows => rows.map(r => ({
        category: r.category || 'General',
        count: Number(r.count || 0),
        amount: new Decimal(r.total || 0).toNumber()
      }))),
    
    // Daily expense trends
    db
      .select({
        date: sql`DATE(${expense.createdAt})`,
        total: dbSum(expense.amount),
      })
      .from(expense)
      .where(and(
        eq(expense.orgId, org.id),
        gte(expense.createdAt, dateFrom),
        lte(expense.createdAt, dateTo)
      ))
      .groupBy(sql`DATE(${expense.createdAt})`)
      .then(rows => rows.map(r => ({
        date: (r.date as string) || new Date().toISOString().split('T')[0],
        amount: new Decimal(r.total || 0).toNumber()
      }))),
    
    // Top 10 expenses
    db
      .select()
      .from(expense)
      .where(and(
        eq(expense.orgId, org.id),
        gte(expense.createdAt, dateFrom),
        lte(expense.createdAt, dateTo)
      ))
      .orderBy(desc(expense.amount))
      .limit(10)
      .then(rows => rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category || 'General',
        amount: new Decimal(r.amount).toNumber(),
        notes: r.notes,
        date: r.createdAt
      })))
  ])

  return {
    expenseByCategory,
    expenseTrends,
    topExpenses
  }
}

// ===== CUSTOMER DASHBOARD =====
export async function getCustomerDashboardData(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  const [topCustomers, customerMetrics, creditStatus] = await Promise.all([
    // Top customers by revenue
    db
      .select({
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalSpent: dbSum(sale.total),
        transactionCount: dbSum(sql`1`),
      })
      .from(customer)
      .leftJoin(sale, eq(customer.id, sale.customerId))
      .where(and(
        eq(customer.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(customer.id)
      .orderBy(desc(dbSum(sale.total)))
      .limit(15)
      .then(rows => rows.map(r => ({
        id: r.customerId,
        name: r.name,
        email: r.email,
        phone: r.phone,
        totalRevenue: new Decimal(r.totalSpent || 0).toNumber(),
        transactions: Number(r.transactionCount || 0)
      }))),
    
    // Customer metrics
    db
      .select({
        totalCustomers: sql`COUNT(DISTINCT ${customer.id})`,
        customersWithPurchases: sql`COUNT(DISTINCT ${sale.customerId})`,
        avgTransactionValue: sql`AVG(${sale.total})`,
      })
      .from(customer)
      .leftJoin(sale, and(
        eq(customer.id, sale.customerId),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .where(eq(customer.orgId, org.id))
      .then(rows => ({
        totalCustomers: Number(rows[0]?.totalCustomers || 0),
        customersWithPurchases: Number(rows[0]?.customersWithPurchases || 0),
        avgTransactionValue: new Decimal(rows[0]?.avgTransactionValue || 0).toNumber()
      })),
    
    // Credit sales status
    db
      .select({
        status: creditSale.status,
        count: dbSum(sql`1`),
        totalAmount: dbSum(creditSale.amount),
        amountPaid: dbSum(creditSale.amountPaid),
      })
      .from(creditSale)
      .where(and(
        eq(creditSale.orgId, org.id),
        gte(creditSale.createdAt, dateFrom),
        lte(creditSale.createdAt, dateTo)
      ))
      .groupBy(creditSale.status)
      .then(rows => rows.map(r => ({
        status: r.status || 'unpaid',
        count: Number(r.count || 0),
        totalAmount: new Decimal(r.totalAmount || 0).toNumber(),
        amountPaid: new Decimal(r.amountPaid || 0).toNumber()
      })))
  ])

  return {
    topCustomers,
    customerMetrics,
    creditStatus
  }
}

// ===== INVENTORY DASHBOARD =====
export async function getInventoryDashboardData() {
  const org = await getUserOrganization()
  
  const [inventoryValue, stockStatus, slowMovers, fastMovers] = await Promise.all([
    // Total inventory value
    db
      .select({
        totalValue: dbSum(sql`${product.stock} * ${product.buyingPrice}`),
        totalUnits: dbSum(product.stock),
      })
      .from(product)
      .where(and(
        eq(product.orgId, org.id),
        eq(product.isActive, true)
      ))
      .then(rows => ({
        value: new Decimal(rows[0]?.totalValue || 0).toNumber(),
        units: Number(rows[0]?.totalUnits || 0)
      })),
    
    // Stock status summary
    db
      .select({
        status: sql`CASE 
          WHEN ${product.stock} = 0 THEN 'out_of_stock'
          WHEN ${product.stock} <= ${product.minStock} THEN 'low_stock'
          ELSE 'in_stock'
        END`,
        count: dbSum(sql`1`),
      })
      .from(product)
      .where(and(
        eq(product.orgId, org.id),
        eq(product.isActive, true)
      ))
      .groupBy(sql`CASE 
        WHEN ${product.stock} = 0 THEN 'out_of_stock'
        WHEN ${product.stock} <= ${product.minStock} THEN 'low_stock'
        ELSE 'in_stock'
      END`)
      .then(rows => ({
        inStock: Number(rows.find(r => r.status === 'in_stock')?.count || 0),
        lowStock: Number(rows.find(r => r.status === 'low_stock')?.count || 0),
        outOfStock: Number(rows.find(r => r.status === 'out_of_stock')?.count || 0)
      })),
    
    // Slow movers (not sold in 60 days)
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        lastSale: sql`MAX(${sale.createdAt})`,
      })
      .from(product)
      .leftJoin(saleItem, eq(product.id, saleItem.productId))
      .leftJoin(sale, eq(saleItem.saleId, sale.id))
      .where(and(
        eq(product.orgId, org.id),
        eq(product.isActive, true),
        sql`${product.stock} > 0`
      ))
      .groupBy(product.id)
      .having(sql`MAX(${sale.createdAt}) < NOW() - INTERVAL '60 days' OR MAX(${sale.createdAt}) IS NULL`)
      .limit(10)
      .then(rows => rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku || 'N/A',
        stock: r.stock
      }))),
    
    // Fast movers (top 10 by sales count)
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        salesCount: dbSum(saleItem.quantity),
      })
      .from(product)
      .innerJoin(saleItem, eq(product.id, saleItem.productId))
      .where(eq(product.orgId, org.id))
      .groupBy(product.id)
      .orderBy(desc(dbSum(saleItem.quantity)))
      .limit(10)
      .then(rows => rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku || 'N/A',
        salesCount: Number(r.salesCount || 0)
      })))
  ])

  return {
    inventoryValue,
    stockStatus,
    slowMovers,
    fastMovers
  }
}
