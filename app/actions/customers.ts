'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customer } from '@/lib/db/schema'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

async function getUserId() {
  const pos = await getPosAuthorizationContext()
  if (pos) return pos.userId
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const pos = await getPosAuthorizationContext()
  const organization = pos
    ? await OrganizationService.getOrganization(pos.organizationId, userId)
    : await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, userId)
  if (!config?.enabledModules.includes('customers')) throw new Error('Customers are not enabled for this workspace')
  return organization.id
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
        ilike(customer.email, `%${search}%`),
        ilike(customer.kraPin, `%${search}%`)
      )!
    )
  }
  return db
    .select()
    .from(customer)
    .where(and(...conditions))
    .orderBy(desc(customer.createdAt))
}

export async function getCustomerById(id: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const [item] = await db.select().from(customer)
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId))).limit(1)
  return item ?? null
}

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer’s name').max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email('Enter a valid email address').max(254).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  kraPin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/, 'Enter a valid KRA PIN').optional().or(z.literal('')),
  customerType: z.enum(['individual', 'business']).default('individual'),
  vatRegistered: z.boolean().default(false),
})

function normalizedPhone(value?: string | null) {
  return value?.replace(/[^0-9+]/g, '') || null
}

function normalizedEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null
}

async function assertCustomerIsUnique(orgId: string, data: { phone?: string | null; email?: string | null }, excludeId?: string) {
  const phone = normalizedPhone(data.phone)
  const email = normalizedEmail(data.email)
  if (!phone && !email) return
  const matches = await db.select({ id: customer.id, phone: customer.phone, email: customer.email }).from(customer).where(
    and(eq(customer.orgId, orgId), ...(excludeId ? [sql`${customer.id} <> ${excludeId}`] : []), or(
      ...(phone ? [sql`regexp_replace(${customer.phone}, '[^0-9+]', '', 'g') = ${phone}`] : []),
      ...(email ? [sql`lower(${customer.email}) = ${email}`] : []),
    )!)
  ).limit(1)
  if (matches[0]) throw new Error('A customer with that phone or email already exists')
}

export async function createCustomer(data: {
  name: string
  phone?: string
  email?: string
  address?: string
  kraPin?: string
  customerType?: 'individual' | 'business'
  vatRegistered?: boolean
}) {
  const parsed = customerSchema.parse(data)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await assertCustomerIsUnique(orgId, parsed)
  const id = generateId()
  const createdAt = new Date()
  const phone = normalizedPhone(parsed.phone)
  const email = normalizedEmail(parsed.email)
  await db.insert(customer).values({ id, ...parsed, email, phone, address: parsed.address || null, kraPin: parsed.kraPin || null, userId, orgId, createdAt })
  revalidatePath('/dashboard/customers')
  return {
    id,
    name: parsed.name,
    phone,
    email,
    address: parsed.address || null,
    kraPin: parsed.kraPin || null,
    customerType: parsed.customerType,
    vatRegistered: parsed.vatRegistered,
    createdAt,
  }
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; phone: string; email: string; address: string; kraPin: string; customerType: 'individual' | 'business'; vatRegistered: boolean }>
) {
  const parsed = customerSchema.partial().parse(data)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  await assertCustomerIsUnique(orgId, parsed, id)
  const [updated] = await db
    .update(customer)
    .set({
      ...parsed,
      ...(parsed.email !== undefined ? { email: normalizedEmail(parsed.email) } : {}),
      ...(parsed.phone !== undefined ? { phone: normalizedPhone(parsed.phone) } : {}),
      ...(parsed.address !== undefined ? { address: parsed.address || null } : {}),
      ...(parsed.kraPin !== undefined ? { kraPin: parsed.kraPin || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId)))
    .returning()
  if (!updated) throw new Error('Customer not found')
  revalidatePath('/dashboard/customers')
  return updated
}

export async function deleteCustomer(id: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const deleted = await db
    .delete(customer)
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId)))
    .returning({ id: customer.id })
  if (!deleted[0]) throw new Error('Customer not found')
  revalidatePath('/dashboard/customers')
}
