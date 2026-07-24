'use server'

import { db } from '@/lib/db'
import { sale, customer, product, saleItem, employee, task, performanceGoal } from '@/lib/db/schema'
import { eq, gte, lte, desc, sql, and } from 'drizzle-orm'
import { getUserId, getOrgId } from '@/lib/auth'

// Get sales trend data for charts
export async function getSalesTrendData(days: number = 30) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const trends = await db
      .select({
        date: sql<string>`DATE(${sale.createdAt})`,
        total: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sale)
      .where(
        and(
          eq(sale.orgId, orgId),
          gte(sale.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${sale.createdAt})`)
      .orderBy(sql`DATE(${sale.createdAt})`)

    return trends
  } catch (error) {
    console.error('[v0] Error fetching sales trends:', error)
    return []
  }
}

// Get customer cohort analysis
export async function getCustomerCohorts() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const cohorts = await db
      .select({
        joinMonth: sql<string>`DATE_TRUNC('month', ${customer.createdAt})`,
        cohortSize: sql<number>`COUNT(DISTINCT ${customer.id})`,
        repeatPurchases: sql<number>`COUNT(DISTINCT CASE WHEN (SELECT COUNT(*) FROM ${sale} WHERE ${sale.customerId} = ${customer.id}) > 1 THEN ${customer.id} END)`,
      })
      .from(customer)
      .where(eq(customer.orgId, orgId))
      .groupBy(sql`DATE_TRUNC('month', ${customer.createdAt})`)
      .orderBy(desc(sql`DATE_TRUNC('month', ${customer.createdAt})`))

    return cohorts
  } catch (error) {
    console.error('[v0] Error fetching customer cohorts:', error)
    return []
  }
}

// Get repeat customer metrics
export async function getRepeatCustomerMetrics() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const metrics = await db
      .select({
        customerId: customer.id,
        customerName: customer.name,
        purchaseCount: sql<number>`COUNT(DISTINCT ${sale.id})`,
        totalSpent: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
        averageOrderValue: sql<number>`AVG(CAST(${sale.total} AS FLOAT))`,
        lastPurchaseDate: sql<string>`MAX(${sale.createdAt})`,
      })
      .from(customer)
      .leftJoin(sale, eq(customer.id, sale.customerId))
      .where(eq(customer.orgId, orgId))
      .groupBy(customer.id, customer.name)
      .orderBy(desc(sql`COUNT(DISTINCT ${sale.id})`))
      .limit(20)

    return metrics
  } catch (error) {
    console.error('[v0] Error fetching repeat customer metrics:', error)
    return []
  }
}

// Get product performance
export async function getProductPerformance() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const performance = await db
      .select({
        productId: product.id,
        productName: product.name,
        unitsSold: sql<number>`SUM(${saleItem.quantity})`,
        revenue: sql<number>`SUM(CAST(${saleItem.totalPrice} AS FLOAT))`,
        averagePrice: sql<number>`AVG(CAST(${saleItem.unitPrice} AS FLOAT))`,
        margin: sql<number>`AVG(CAST(${saleItem.unitPrice} AS FLOAT)) - ${product.buyingPrice}`,
      })
      .from(saleItem)
      .innerJoin(product, eq(saleItem.productId, product.id))
      .where(eq(product.orgId, orgId))
      .groupBy(product.id, product.name, product.buyingPrice)
      .orderBy(desc(sql`SUM(CAST(${saleItem.totalPrice} AS FLOAT))`))
      .limit(20)

    return performance
  } catch (error) {
    console.error('[v0] Error fetching product performance:', error)
    return []
  }
}

// Get staff KPIs
export async function getStaffKPIs() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const kpis = await db
      .select({
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        totalSales: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
        transactionCount: sql<number>`COUNT(DISTINCT ${sale.id})`,
        averageTransaction: sql<number>`AVG(CAST(${sale.total} AS FLOAT))`,
      })
      .from(employee)
      .leftJoin(sale, and(eq(employee.id, sql`${sale.userId}`), eq(sale.orgId, orgId)))
      .where(eq(employee.orgId, orgId))
      .groupBy(employee.id, employee.name, employee.department)
      .orderBy(desc(sql`SUM(CAST(${sale.total} AS FLOAT))`))

    return kpis
  } catch (error) {
    console.error('[v0] Error fetching staff KPIs:', error)
    return []
  }
}

// Get hourly sales patterns
export async function getHourlyPatterns() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const patterns = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${sale.createdAt})`,
        totalSales: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
        transactionCount: sql<number>`COUNT(DISTINCT ${sale.id})`,
        averageTransaction: sql<number>`AVG(CAST(${sale.total} AS FLOAT))`,
      })
      .from(sale)
      .where(eq(sale.orgId, orgId))
      .groupBy(sql`EXTRACT(HOUR FROM ${sale.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${sale.createdAt})`)

    return patterns
  } catch (error) {
    console.error('[v0] Error fetching hourly patterns:', error)
    return []
  }
}

// Get sales forecast (simple linear trend)
export async function getSalesForecast(days: number = 30) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const historicalData = await db
      .select({
        date: sql<string>`DATE(${sale.createdAt})`,
        total: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
      })
      .from(sale)
      .where(
        and(
          eq(sale.orgId, orgId),
          gte(sale.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(sql`DATE(${sale.createdAt})`)
      .orderBy(sql`DATE(${sale.createdAt})`)

    // Simple linear regression forecast
    if (historicalData.length < 2) return []

    const dates = historicalData.map((d, i) => i)
    const values = historicalData.map(d => d.total || 0)
    
    const n = dates.length
    const sumX = dates.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = dates.reduce((sum, x, i) => sum + x * values[i], 0)
    const sumX2 = dates.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const forecast = []
    const lastDate = new Date(historicalData[historicalData.length - 1].date)
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate)
      forecastDate.setDate(forecastDate.getDate() + i)
      const predictedValue = intercept + slope * (n + i - 1)
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted: Math.max(0, predictedValue),
      })
    }

    return forecast
  } catch (error) {
    console.error('[v0] Error fetching sales forecast:', error)
    return []
  }
}

// Get pending tasks
export async function getPendingTasks() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const tasks = await db
      .select({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        assignee: employee.name,
        status: task.status,
      })
      .from(task)
      .leftJoin(employee, eq(task.assigneeId, employee.id))
      .where(
        and(
          eq(task.orgId, orgId),
          eq(task.status, 'pending')
        )
      )
      .orderBy(task.priority, task.dueDate)
      .limit(10)

    return tasks
  } catch (error) {
    console.error('[v0] Error fetching pending tasks:', error)
    return []
  }
}

// Get performance goals progress
export async function getPerformanceGoalsProgress() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const goals = await db
      .select({
        id: performanceGoal.id,
        employeeName: employee.name,
        title: performanceGoal.title,
        target: performanceGoal.target,
        achieved: performanceGoal.achieved,
        period: performanceGoal.period,
        progress: sql<number>`(${performanceGoal.achieved} / ${performanceGoal.target}) * 100`,
      })
      .from(performanceGoal)
      .innerJoin(employee, eq(performanceGoal.employeeId, employee.id))
      .where(eq(performanceGoal.orgId, orgId))
      .orderBy(desc(performanceGoal.createdAt))
      .limit(20)

    return goals
  } catch (error) {
    console.error('[v0] Error fetching performance goals:', error)
    return []
  }
}

// Get outstanding payments
export async function getOutstandingPayments() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const outstanding = await db
      .select({
        id: sql`${sql.raw('credit_sale')}.id`,
        customerName: customer.name,
        amount: sql`CAST(${sql.raw('credit_sale')}.amount AS FLOAT)`,
        amountPaid: sql`CAST(${sql.raw('credit_sale')}.amount_paid AS FLOAT)`,
        dueDate: sql`${sql.raw('credit_sale')}.due_date`,
        daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - ${sql.raw('credit_sale')}.due_date)`,
      })
      .from(sql.raw('credit_sale'))
      .innerJoin(customer, eq(customer.id, sql.raw('credit_sale.customer_id')))
      .where(
        and(
          eq(sql.raw('credit_sale.org_id'), orgId),
          eq(sql.raw('credit_sale.status'), 'unpaid')
        )
      )
      .orderBy(desc(sql`NOW() - ${sql.raw('credit_sale')}.due_date`))
      .limit(20)

    return outstanding
  } catch (error) {
    console.error('[v0] Error fetching outstanding payments:', error)
    return []
  }
}
