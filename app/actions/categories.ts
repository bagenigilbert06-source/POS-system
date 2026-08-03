'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent, category, organizationMembership, product } from '@/lib/db/schema'
import { and, count, eq, isNull, ne } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'

const categoryInput = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional(), parentCategoryId: z.string().min(1).nullable().optional(), imageUrl: z.string().url().or(z.string().startsWith('/')).nullable().optional() })

async function categoryContext(requireManage = false) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization available')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, session.user.id)
  if (!config?.enabledModules.includes('products')) throw new Error('Products are not enabled for this workspace')
  if (requireManage && organization.userId !== session.user.id) {
    const [membership] = await db.select({ role: organizationMembership.role }).from(organizationMembership).where(and(eq(organizationMembership.organizationId, organization.id), eq(organizationMembership.userId, session.user.id))).limit(1)
    if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) throw new Error('You do not have permission to manage categories')
  }
  return { userId: session.user.id, orgId: organization.id }
}

function toSlug(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function parentCondition(parentCategoryId?: string | null) { return parentCategoryId ? eq(category.parentCategoryId, parentCategoryId) : isNull(category.parentCategoryId) }

async function assertParent(orgId: string, parentCategoryId: string | null | undefined, categoryId?: string) {
  if (!parentCategoryId) return
  if (parentCategoryId === categoryId) throw new Error('A category cannot be its own parent')
  const all = await db.select({ id: category.id, parentCategoryId: category.parentCategoryId, isActive: category.isActive }).from(category).where(eq(category.orgId, orgId))
  const parent = all.find((item) => item.id === parentCategoryId)
  if (!parent) throw new Error('Parent category not found')
  if (!parent.isActive) throw new Error('Archived categories cannot be parents')
  let cursor = parent
  while (cursor.parentCategoryId) {
    if (cursor.parentCategoryId === categoryId) throw new Error('A category cannot be moved beneath one of its children')
    const next = all.find((item) => item.id === cursor.parentCategoryId)
    if (!next) break
    cursor = next
  }
}

async function ensureUnique(orgId: string, name: string, slug: string, parentCategoryId?: string | null, excludeId?: string) {
  const siblings = await db.select({ id: category.id, name: category.name, slug: category.slug }).from(category).where(and(eq(category.orgId, orgId), parentCondition(parentCategoryId), ...(excludeId ? [ne(category.id, excludeId)] : [])))
  if (siblings.some((item) => item.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0)) throw new Error('A category with this name already exists under the selected parent')
  const [slugMatch] = await db.select({ id: category.id }).from(category).where(and(eq(category.orgId, orgId), eq(category.slug, slug), ...(excludeId ? [ne(category.id, excludeId)] : []))).limit(1)
  if (slugMatch) throw new Error('A category with this slug already exists')
}

export async function getCategories(includeArchived = false) {
  const { orgId } = await categoryContext()
  const rows = await db.select({ id: category.id, name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl, parentCategoryId: category.parentCategoryId, isActive: category.isActive, createdAt: category.createdAt, updatedAt: category.updatedAt, productCount: count(product.id) }).from(category).leftJoin(product, and(eq(product.categoryId, category.id), eq(product.orgId, orgId), eq(product.isActive, true))).where(eq(category.orgId, orgId)).groupBy(category.id).orderBy(category.name)
  return includeArchived ? rows : rows.filter((item) => item.isActive)
}

export async function getCategoryDetails(id: string) {
  const { orgId } = await categoryContext()
  const [selected] = await db.select({ id: category.id, name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl, parentCategoryId: category.parentCategoryId, isActive: category.isActive, productCount: count(product.id) }).from(category).leftJoin(product, and(eq(product.categoryId, category.id), eq(product.orgId, orgId), eq(product.isActive, true))).where(and(eq(category.id, id), eq(category.orgId, orgId))).groupBy(category.id).limit(1)
  if (!selected) return null
  const children = await db.select({ id: category.id, name: category.name, imageUrl: category.imageUrl, productCount: count(product.id) }).from(category).leftJoin(product, and(eq(product.categoryId, category.id), eq(product.orgId, orgId), eq(product.isActive, true))).where(and(eq(category.parentCategoryId, id), eq(category.orgId, orgId), eq(category.isActive, true))).groupBy(category.id).orderBy(category.name)
  return { category: selected, children }
}

export async function createCategory(input: z.infer<typeof categoryInput>) {
  const data = categoryInput.parse(input)
  const { userId, orgId } = await categoryContext(true)
  const slug = toSlug(data.name)
  if (!slug) throw new Error('Enter a valid category name')
  await assertParent(orgId, data.parentCategoryId)
  await ensureUnique(orgId, data.name, slug, data.parentCategoryId)
  const id = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(category).values({ id, name: data.name, slug, description: data.description || null, imageUrl: data.imageUrl || null, parentCategoryId: data.parentCategoryId || null, isActive: true, userId, orgId, updatedAt: new Date() })
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'category.created', metadata: { categoryId: id, name: data.name } })
  })
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/products/categories')
  return { id, name: data.name, slug, parentCategoryId: data.parentCategoryId || null, isActive: true }
}

export async function updateCategory(id: string, input: z.infer<typeof categoryInput>) {
  const data = categoryInput.parse(input)
  const { userId, orgId } = await categoryContext(true)
  const [current] = await db.select().from(category).where(and(eq(category.id, id), eq(category.orgId, orgId))).limit(1)
  if (!current) throw new Error('Category not found')
  if (current.slug === 'uncategorised') throw new Error('The Uncategorised category cannot be changed')
  const slug = toSlug(data.name)
  await assertParent(orgId, data.parentCategoryId, id)
  await ensureUnique(orgId, data.name, slug, data.parentCategoryId, id)
  await db.transaction(async (tx) => {
    await tx.update(category).set({ name: data.name, slug, description: data.description || null, imageUrl: data.imageUrl || null, parentCategoryId: data.parentCategoryId || null, updatedAt: new Date() }).where(and(eq(category.id, id), eq(category.orgId, orgId)))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'category.updated', metadata: { categoryId: id, name: data.name } })
  })
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/products/categories')
}

export async function setCategoryActive(id: string, isActive: boolean) {
  const { userId, orgId } = await categoryContext(true)
  const [current] = await db.select().from(category).where(and(eq(category.id, id), eq(category.orgId, orgId))).limit(1)
  if (!current) throw new Error('Category not found')
  if (current.slug === 'uncategorised' && !isActive) throw new Error('The Uncategorised category cannot be archived')
  await db.transaction(async (tx) => {
    await tx.update(category).set({ isActive, updatedAt: new Date() }).where(and(eq(category.id, id), eq(category.orgId, orgId)))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: isActive ? 'category.restored' : 'category.archived', metadata: { categoryId: id } })
  })
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/products/categories')
}
