'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, category } from '@/lib/db/schema'
import { invalidateCategoryCache } from '@/lib/cache/redis-cache'
import { generateId } from '@/lib/utils'
import { PermissionEnum } from '@/lib/types/permissions'
import { LIQUOR_PARENTS, canonicalParentFor } from '@/lib/liquor/categories'

const rowSchema = z.object({ rowNumber: z.number().int().positive(), name: z.string(), description: z.string().optional(), ageRestricted: z.string().optional(), isActive: z.string().optional() })
const schema = z.object({ rows: z.array(rowSchema).min(1).max(500) })
type ValidRow = { rowNumber: number; name: string; description: string; normalized: string; ageRestricted: boolean; isActive: boolean; parentName?: string }
export type CategoryImportPreview = { validRows: number; invalidRows: number; warnings: string[]; errors: Array<{ rowNumber: number; message: string }>; rows: Array<{ rowNumber: number; name: string; parentName: string }> }
const parseBoolean = (value: string) => ['true', 'yes', '1'].includes(value.trim().toLowerCase()) ? true : ['false', 'no', '0'].includes(value.trim().toLowerCase()) ? false : null
const slug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function validate(input: z.infer<typeof schema>) {
  const authorization = await getAuthorizationContext()
  if (!authorization.permissions.includes(PermissionEnum.CATALOG_IMPORT)) throw new Error('You do not have permission to import categories.')
  const errors: CategoryImportPreview['errors'] = []; const rows: ValidRow[] = []; const warnings: string[] = []
  for (const raw of input.rows) {
    const name = raw.name.trim().replace(/\s+/g, ' '), description = (raw.description || '').trim().slice(0, 300), ageRestricted = raw.ageRestricted?.trim() ? parseBoolean(raw.ageRestricted) : false, isActive = raw.isActive?.trim() ? parseBoolean(raw.isActive) : true
    if (!name) errors.push({ rowNumber: raw.rowNumber, message: 'Missing category name.' })
    else if (name.length > 80 || !slug(name)) errors.push({ rowNumber: raw.rowNumber, message: 'Category name is invalid or too long.' })
    if (ageRestricted === null) errors.push({ rowNumber: raw.rowNumber, message: 'ageRestricted must be true or false.' })
    if (isActive === null) errors.push({ rowNumber: raw.rowNumber, message: 'isActive must be true or false.' })
    if (name && name.length <= 80 && slug(name) && ageRestricted !== null && isActive !== null) rows.push({ rowNumber: raw.rowNumber, name, description, normalized: name.toLowerCase(), ageRestricted, isActive, parentName: canonicalParentFor(name) })
  }
  for (const row of rows) if (rows.filter((candidate) => candidate.normalized === row.normalized).length > 1) errors.push({ rowNumber: row.rowNumber, message: `Duplicate category in file: ${row.name}` })
  const clean = rows.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber))
  const existing = await db.select({ name: category.name }).from(category).where(eq(category.orgId, authorization.organizationId))
  const existingNames = new Set(existing.map((row) => row.name.trim().replace(/\s+/g, ' ').toLowerCase()))
  const unique = clean.filter((row) => { if (!existingNames.has(row.normalized)) return true; warnings.push(`${row.name} already exists and will be skipped.`); return false })
  return { authorization, valid: unique.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber)), errors, warnings }
}

export async function previewCategoryImport(input: z.input<typeof schema>): Promise<CategoryImportPreview> { const result = await validate(schema.parse(input)); return { validRows: result.valid.length, invalidRows: new Set(result.errors.map((error) => error.rowNumber)).size, warnings: result.warnings, errors: result.errors, rows: result.valid.map((row) => ({ rowNumber: row.rowNumber, name: row.name, parentName: row.parentName ?? 'Unassigned' })) } }
export async function importCategoriesFromCsv(input: z.input<typeof schema>) {
  const result = await validate(schema.parse(input)); if (!result.valid.length) throw new Error(result.errors.slice(0, 20).map((error) => `Row ${error.rowNumber}: ${error.message}`).join('\n') || 'No valid categories to import.')
  let imported = 0
  await db.transaction(async (tx) => { await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${result.authorization.organizationId}:category-import`}))`); const parents = new Map<string, string>(); for (const parentName of LIQUOR_PARENTS.filter((name) => result.valid.some((row) => row.parentName === name))) { const parentSlug = slug(parentName); const [existing] = await tx.select({ id: category.id }).from(category).where(and(eq(category.orgId, result.authorization.organizationId), eq(category.slug, parentSlug))).limit(1); const id = existing?.id ?? generateId(); if (!existing) await tx.insert(category).values({ id, name: parentName, description: `${parentName} products`, slug: parentSlug, isActive: true, userId: result.authorization.userId, orgId: result.authorization.organizationId, updatedAt: new Date() }).onConflictDoNothing(); parents.set(parentName, id) } for (const row of result.valid) { const existing = await tx.select({ id: category.id }).from(category).where(and(eq(category.orgId, result.authorization.organizationId), eq(category.name, row.name))).limit(1); if (existing.length) continue; const id = generateId(); const inserted = await tx.insert(category).values({ id, name: row.name, description: row.description || null, slug: slug(row.name), parentCategoryId: row.parentName ? parents.get(row.parentName) : null, requiresAgeVerification: row.ageRestricted, isActive: row.isActive, userId: result.authorization.userId, orgId: result.authorization.organizationId, updatedAt: new Date() }).onConflictDoNothing().returning({ id: category.id }); if (inserted.length) imported++ }; if (imported) await tx.insert(auditEvent).values({ id: generateId(), organizationId: result.authorization.organizationId, userId: result.authorization.userId, action: 'categories.csv_imported', metadata: { count: imported, rows: result.valid.map((row) => row.rowNumber) } }) })
  await invalidateCategoryCache(result.authorization.organizationId); revalidatePath('/dashboard/products/categories'); revalidatePath('/dashboard/products')
  return { success: true, imported, skipped: result.errors.length + result.valid.length - imported }
}
