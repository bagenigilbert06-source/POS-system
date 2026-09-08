'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, category } from '@/lib/db/schema'
import { invalidateCategoryCache } from '@/lib/cache/redis-cache'
import { generateId } from '@/lib/utils'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'

const rowSchema = z.object({ rowNumber: z.number().int().positive(), name: z.string(), ageRestricted: z.string(), isActive: z.string() })
const schema = z.object({ rows: z.array(rowSchema).min(1).max(200) })
type ValidRow = { rowNumber: number; name: string; normalized: string; ageRestricted: boolean; isActive: boolean }
export type CategoryImportPreview = { validRows: number; invalidRows: number; warnings: string[]; errors: Array<{ rowNumber: number; message: string }> }
const parseBoolean = (value: string) => ['true', 'yes', '1'].includes(value.trim().toLowerCase()) ? true : ['false', 'no', '0'].includes(value.trim().toLowerCase()) ? false : null
const slug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function validate(input: z.infer<typeof schema>) {
  const authorization = await getAuthorizationContext()
  if (!authorization.permissions.includes(PermissionEnum.PRODUCT_EDIT) || ![RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.MANAGER].includes(authorization.role)) throw new Error('You do not have permission to import categories.')
  const errors: CategoryImportPreview['errors'] = []; const rows: ValidRow[] = []
  for (const raw of input.rows) {
    const name = raw.name.trim().replace(/\s+/g, ' '), ageRestricted = parseBoolean(raw.ageRestricted), isActive = parseBoolean(raw.isActive)
    if (!name) errors.push({ rowNumber: raw.rowNumber, message: 'Missing category name.' })
    else if (name.length > 80 || !slug(name)) errors.push({ rowNumber: raw.rowNumber, message: 'Category name is invalid or too long.' })
    if (ageRestricted === null) errors.push({ rowNumber: raw.rowNumber, message: 'ageRestricted must be true or false.' })
    if (isActive === null) errors.push({ rowNumber: raw.rowNumber, message: 'isActive must be true or false.' })
    if (name && name.length <= 80 && slug(name) && ageRestricted !== null && isActive !== null) rows.push({ rowNumber: raw.rowNumber, name, normalized: name.toLowerCase(), ageRestricted, isActive })
  }
  for (const row of rows) if (rows.filter((candidate) => candidate.normalized === row.normalized).length > 1) errors.push({ rowNumber: row.rowNumber, message: `Duplicate category in file: ${row.name}` })
  const clean = rows.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber))
  const existing = await db.select({ name: category.name }).from(category).where(eq(category.orgId, authorization.organizationId))
  const existingNames = new Set(existing.map((row) => row.name.trim().replace(/\s+/g, ' ').toLowerCase()))
  for (const row of clean) if (existingNames.has(row.normalized)) errors.push({ rowNumber: row.rowNumber, message: `Category already exists: ${row.name}` })
  return { authorization, valid: clean.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber)), errors }
}

export async function previewCategoryImport(input: z.input<typeof schema>): Promise<CategoryImportPreview> { const result = await validate(schema.parse(input)); return { validRows: result.valid.length, invalidRows: new Set(result.errors.map((error) => error.rowNumber)).size, warnings: [], errors: result.errors } }
export async function importCategoriesFromCsv(input: z.input<typeof schema>) {
  const result = await validate(schema.parse(input)); if (result.errors.length) throw new Error(result.errors.slice(0, 20).map((error) => `Row ${error.rowNumber}: ${error.message}`).join('\n'))
  await db.transaction(async (tx) => { for (const row of result.valid) { const id = generateId(); await tx.insert(category).values({ id, name: row.name, slug: `${slug(row.name)}-${id.slice(0, 8)}`, requiresAgeVerification: row.ageRestricted, isActive: row.isActive, userId: result.authorization.userId, orgId: result.authorization.organizationId, updatedAt: new Date() }) }; await tx.insert(auditEvent).values({ id: generateId(), organizationId: result.authorization.organizationId, userId: result.authorization.userId, action: 'categories.csv_imported', metadata: { count: result.valid.length, rows: result.valid.map((row) => row.rowNumber) } }) })
  await invalidateCategoryCache(result.authorization.organizationId); revalidatePath('/dashboard/products/categories'); revalidatePath('/dashboard/products')
  return { success: true, imported: result.valid.length }
}
