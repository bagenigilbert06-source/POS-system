'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent, customer, customerRewardAccount } from '@/lib/db/schema'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { resolvePriceLevel } from '@/lib/pricing/price-levels'
import { AuthorizationError, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

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

async function requireCustomerMutationPermission(permission: PermissionEnum) {
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requirePermission(permission)
  if (pos && !pos.permissions.includes(permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`)
  }
  const config = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!config?.enabledModules.includes('customers')) throw new Error('Customers are not enabled for this workspace')
  return authorization
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
    .select({ customer, pointsBalance: customerRewardAccount.pointsBalance, bonusBalance: customerRewardAccount.bonusBalance })
    .from(customer)
    .leftJoin(customerRewardAccount, and(eq(customerRewardAccount.customerId, customer.id), eq(customerRewardAccount.organizationId, orgId)))
    .where(and(...conditions))
    .orderBy(desc(customer.createdAt))
    .then(rows => rows.map(({ customer: row, pointsBalance, bonusBalance }) => ({ ...row, pointsBalance: pointsBalance ?? row.loyaltyPoints, bonusBalance: Number(bonusBalance ?? 0) })))
}

export async function getCustomerById(id: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const [item] = await db.select({ customer, pointsBalance: customerRewardAccount.pointsBalance, bonusBalance: customerRewardAccount.bonusBalance }).from(customer)
    .leftJoin(customerRewardAccount, and(eq(customerRewardAccount.customerId, customer.id), eq(customerRewardAccount.organizationId, orgId)))
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId))).limit(1)
  return item ? { ...item.customer, pointsBalance: item.pointsBalance ?? item.customer.loyaltyPoints, bonusBalance: Number(item.bonusBalance ?? 0) } : null
}

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer’s name').max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email('Enter a valid email address').max(254).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  kraPin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/, 'Enter a valid KRA PIN').optional().or(z.literal('')),
  customerType: z.enum(['individual', 'business']).default('individual'),
  priceLevel: z.enum(['retail', 'wholesale']).default('retail'),
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
  priceLevel?: 'retail' | 'wholesale'
  vatRegistered?: boolean
}) {
  const parsed = customerSchema.parse(data)
  const authorization = await requireCustomerMutationPermission(PermissionEnum.CUSTOMER_CREATE)
  const { userId, organizationId: orgId } = authorization
  await assertCustomerIsUnique(orgId, parsed)
  const id = generateId()
  const createdAt = new Date()
  const phone = normalizedPhone(parsed.phone)
  const email = normalizedEmail(parsed.email)
  const priceLevel = resolvePriceLevel(parsed)
  await db.insert(customer).values({ id, ...parsed, priceLevel, email, phone, address: parsed.address || null, kraPin: parsed.kraPin || null, userId, orgId, createdAt })
  revalidatePath('/dashboard/customers')
  return {
    id,
    name: parsed.name,
    phone,
    email,
    address: parsed.address || null,
    kraPin: parsed.kraPin || null,
    customerType: parsed.customerType,
    priceLevel,
    vatRegistered: parsed.vatRegistered,
    createdAt,
  }
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; phone: string; email: string; address: string; kraPin: string; customerType: 'individual' | 'business'; priceLevel: 'retail' | 'wholesale'; vatRegistered: boolean }>
) {
  const parsed = customerSchema.partial().parse(data)
  const authorization = await requireCustomerMutationPermission(PermissionEnum.CUSTOMER_EDIT)
  const { userId, organizationId: orgId } = authorization
  const [current] = await db.select().from(customer).where(and(eq(customer.id, id), eq(customer.orgId, orgId))).limit(1)
  if (!current) throw new Error('Customer not found')
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
  if (parsed.customerType !== undefined && parsed.customerType !== current.customerType) {
    await db.insert(auditEvent).values({
      id: generateId(), organizationId: orgId, userId,
      action: 'customer.type_changed',
      metadata: {
        customerId: id,
        oldCustomerType: current.customerType,
        newCustomerType: parsed.customerType,
      },
    })
  }
  if (parsed.priceLevel !== undefined && parsed.priceLevel !== current.priceLevel) {
    await db.insert(auditEvent).values({
      id: generateId(), organizationId: orgId, userId,
      action: 'customer.price_level_changed',
      metadata: { source: 'CUSTOMER_EDIT', customerId: id, oldPriceLevel: current.priceLevel, newPriceLevel: parsed.priceLevel },
    })
  }
  revalidatePath('/dashboard/customers')
  return updated
}

export async function deleteCustomer(id: string) {
  const authorization = await requireCustomerMutationPermission(PermissionEnum.CUSTOMER_DELETE)
  const { organizationId: orgId } = authorization
  const deleted = await db
    .delete(customer)
    .where(and(eq(customer.id, id), eq(customer.orgId, orgId)))
    .returning({ id: customer.id })
  if (!deleted[0]) throw new Error('Customer not found')
  revalidatePath('/dashboard/customers')
}
