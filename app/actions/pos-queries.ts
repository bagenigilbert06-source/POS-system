'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sale, saleItem, product } from '@/lib/db/schema'
import { and, eq, desc, gte, lte, like, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const organization = await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  return organization.id
}

export async function getSalesByReceiptNo(receiptNo: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const sales = await db
    .select()
    .from(sale)
    .where(
      and(
        eq(sale.orgId, orgId),
        like(sale.receiptNo, `%${receiptNo}%`)
      )
    )
    .orderBy(desc(sale.createdAt))
    .limit(20)

  // Get items for each sale
  const salesWithItems = await Promise.all(
    sales.map(async (s) => {
      const items = await db
        .select()
        .from(saleItem)
        .where(and(eq(saleItem.saleId, s.id), eq(saleItem.orgId, orgId)))
      return { ...s, items }
    })
  )

  return salesWithItems
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const sales = await db
    .select()
    .from(sale)
    .where(
      and(
        eq(sale.orgId, orgId),
        gte(sale.createdAt, startDate),
        lte(sale.createdAt, endDate)
      )
    )
    .orderBy(desc(sale.createdAt))
    .limit(100)

  // Get items for each sale
  const salesWithItems = await Promise.all(
    sales.map(async (s) => {
      const items = await db
        .select()
        .from(saleItem)
        .where(and(eq(saleItem.saleId, s.id), eq(saleItem.orgId, orgId)))
      return { ...s, items }
    })
  )

  return salesWithItems
}

export async function getSalesByCustomer(customerId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const sales = await db
    .select()
    .from(sale)
    .where(
      and(
        eq(sale.orgId, orgId),
        eq(sale.customerId, customerId)
      )
    )
    .orderBy(desc(sale.createdAt))
    .limit(50)

  // Get items for each sale
  const salesWithItems = await Promise.all(
    sales.map(async (s) => {
      const items = await db
        .select()
        .from(saleItem)
        .where(and(eq(saleItem.saleId, s.id), eq(saleItem.orgId, orgId)))
      return { ...s, items }
    })
  )

  return salesWithItems
}

export async function getRecentSales(limit = 20) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const sales = await db
    .select()
    .from(sale)
    .where(eq(sale.orgId, orgId))
    .orderBy(desc(sale.createdAt))
    .limit(limit)

  // Get items for each sale
  const salesWithItems = await Promise.all(
    sales.map(async (s) => {
      const items = await db
        .select()
        .from(saleItem)
        .where(and(eq(saleItem.saleId, s.id), eq(saleItem.orgId, orgId)))
      return { ...s, items }
    })
  )

  return salesWithItems
}
