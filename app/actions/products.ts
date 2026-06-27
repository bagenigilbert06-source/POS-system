'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { product, organization } from '@/lib/db/schema'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId } from '@/lib/utils'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const org = await db
    .select()
    .from(organization)
    .where(eq(organization.userId, userId))
    .limit(1)
  return org[0]?.id ?? userId
}

export async function getProducts(search?: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const conditions = [eq(product.orgId, orgId)]
  if (search) {
    conditions.push(
      or(
        ilike(product.name, `%${search}%`),
        ilike(product.sku, `%${search}%`),
        ilike(product.barcode, `%${search}%`)
      )!
    )
  }

  return db
    .select()
    .from(product)
    .where(and(...conditions))
    .orderBy(desc(product.createdAt))
}

export async function getLowStockProducts() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  return db
    .select()
    .from(product)
    .where(
      and(
        eq(product.orgId, orgId),
        sql`${product.stock} <= ${product.minStock}`
      )
    )
    .orderBy(product.stock)
    .limit(10)
}

export async function createProduct(data: {
  name: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  buyingPrice: number
  sellingPrice: number
  stock: number
  minStock: number
  unit: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const id = generateId()
  await db.insert(product).values({
    id,
    ...data,
    buyingPrice: String(data.buyingPrice),
    sellingPrice: String(data.sellingPrice),
    userId,
    orgId,
  })
  revalidatePath('/dashboard/products')
  return { id }
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string
    sku: string
    barcode: string
    description: string
    categoryId: string
    buyingPrice: number
    sellingPrice: number
    stock: number
    minStock: number
    unit: string
    isActive: boolean
  }>
) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await db
    .update(product)
    .set({
      ...data,
      ...(data.buyingPrice !== undefined ? { buyingPrice: String(data.buyingPrice) } : {}),
      ...(data.sellingPrice !== undefined ? { sellingPrice: String(data.sellingPrice) } : {}),
      updatedAt: new Date(),
    } as any)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)))
  revalidatePath('/dashboard/products')
}

export async function deleteProduct(id: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await db
    .delete(product)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)))
  revalidatePath('/dashboard/products')
}
