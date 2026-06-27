'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customer, organization } from '@/lib/db/schema'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
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

export async function getCustomers(search?: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const conditions = [eq(customer.orgId, orgId)]
  if (search) {
    conditions.push(
      or(
        ilike(customer.name, `%${search}%`),
        ilike(customer.phone, `%${search}%`),
        ilike(customer.email, `%${search}%`)
      )!
    )
  }
  return db
    .select()
    .from(customer)
    .where(and(...conditions))
    .orderBy(desc(customer.createdAt))
}

export async function createCustomer(data: {
  name: string
  phone?: string
  email?: string
  address?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const id = generateId()
  await db.insert(customer).values({ id, ...data, userId, orgId })
  revalidatePath('/dashboard/customers')
  return { id }
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; phone: string; email: string; address: string }>
) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await db
    .update(customer)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId)))
  revalidatePath('/dashboard/customers')
}

export async function deleteCustomer(id: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await db
    .delete(customer)
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId)))
  revalidatePath('/dashboard/customers')
}
