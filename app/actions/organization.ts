'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId, slugify } from '@/lib/utils'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getOrganization() {
  const userId = await getUserId()
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.userId, userId))
    .limit(1)
  return org ?? null
}

export async function createOrganization(data: {
  name: string
  businessType: string
  currency?: string
  taxRate?: number
}) {
  const userId = await getUserId()
  const id = generateId()
  const slug = slugify(data.name)
  await db.insert(organization).values({
    id,
    name: data.name,
    slug,
    businessType: data.businessType,
    currency: data.currency ?? 'KES',
    taxRate: String(data.taxRate ?? 16),
    userId,
  })
  revalidatePath('/dashboard')
  return { id }
}

export async function updateOrganization(data: Partial<{
  name: string
  businessType: string
  currency: string
  taxRate: number
}>) {
  const userId = await getUserId()
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.userId, userId))
    .limit(1)
  if (!org) throw new Error('Organization not found')
  await db
    .update(organization)
    .set({
      ...data,
      updatedAt: new Date(),
    } as any)
    .where(eq(organization.id, org.id))
  revalidatePath('/dashboard/settings')
}
