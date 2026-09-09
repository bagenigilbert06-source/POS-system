'use server'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, branch, category, product } from '@/lib/db/schema'
import { addCostLayer, applyInventoryMovement } from '@/lib/inventory/inventory-service'
import { invalidateCategoryCache, invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId, normalizeBarcode } from '@/lib/utils'
import { classifyLiquorProduct, NON_PRODUCT_LINE_PATTERN } from '@/lib/liquor/categories'
import { PRODUCT_IMPORT_STATUSES, type ProductImportPreview, type ProductImportRow, type ProductImportStatus } from '@/lib/products/product-import-types'

const rawRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z.string(), sku: z.string(), barcode: z.string().optional(), category: z.string(),
  costPrice: z.string(), sellingPrice: z.string(), openingStock: z.string(), ageRestricted: z.string(),
  isActive: z.string().optional(),
})
const requestSchema = z.object({ branchId: z.string().min(1), rows: z.array(rawRowSchema).min(1).max(500) })
type RawRow = z.infer<typeof rawRowSchema>
type ValidRow = { rowNumber: number; name: string; sku: string; barcode: string | null; category: string; costPrice: number | null; sellingPrice: number; openingStock: number; ageRestricted: boolean; isActive: boolean }

const bool = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return null
}
const decimal = (value: string) => value.trim() === '' ? Number.NaN : Number(value.replace(/,/g, ''))

async function validate(input: z.infer<typeof requestSchema>) {
  const auth = await requirePermission(PermissionEnum.CATALOG_IMPORT)
  const workspace = await WorkspaceService.getWorkspaceConfig(auth.organizationId, auth.userId)
  if (workspace && isPharmacyBusiness(workspace.businessType, workspace.businessCategory))
    throw new Error('Use the pharmacy medicine importer for pharmacy catalogues so batches and expiries remain traceable.')
  if (!auth.isOrganizationWide && !auth.branchIds.includes(input.branchId)) throw new Error('You do not have access to this inventory branch.')
  const [selectedBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, input.branchId), eq(branch.organizationId, auth.organizationId))).limit(1)
  if (!selectedBranch) throw new Error('Selected branch was not found in this organization.')

  const errors: ProductImportPreview['errors'] = []
  const valid: ValidRow[] = []
  for (const raw of input.rows) {
    const name = raw.name.trim(), sku = raw.sku.trim().toUpperCase(), barcode = normalizeBarcode(raw.barcode || '') || null
    const categoryName = classifyLiquorProduct(name) || raw.category.trim(), costPrice = raw.costPrice.trim() === '' ? null : decimal(raw.costPrice), sellingPrice = decimal(raw.sellingPrice), openingStock = raw.openingStock.trim() === '' ? 0 : decimal(raw.openingStock)
    const suppliedRestriction = raw.ageRestricted.trim() ? bool(raw.ageRestricted) : null, active = raw.isActive?.trim() ? bool(raw.isActive) : true
    if (NON_PRODUCT_LINE_PATTERN.test(name)) errors.push({ rowNumber: raw.rowNumber, message: 'Excluded: accounting/non-stock line.' })
    if (!name || name.length > 180) errors.push({ rowNumber: raw.rowNumber, message: 'Product name is required and must be 180 characters or fewer.' })
    if (!sku || sku.length > 120) errors.push({ rowNumber: raw.rowNumber, message: 'SKU is required and must be 120 characters or fewer.' })
    if (categoryName.length > 80) errors.push({ rowNumber: raw.rowNumber, message: 'Category is invalid or too long.' })
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) errors.push({ rowNumber: raw.rowNumber, message: 'Cost price must be blank or a number of zero or greater.' })
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) errors.push({ rowNumber: raw.rowNumber, message: 'Selling price must be zero or greater.' })
    if (!Number.isInteger(openingStock) || openingStock < 0) errors.push({ rowNumber: raw.rowNumber, message: 'Opening stock must be a whole number of zero or greater.' })
    if (raw.ageRestricted.trim() && suppliedRestriction === null) errors.push({ rowNumber: raw.rowNumber, message: 'ageRestricted must be blank, true or false.' })
    if (active === null) errors.push({ rowNumber: raw.rowNumber, message: 'isActive must be true or false when supplied.' })
    if (costPrice !== null && Number.isFinite(costPrice) && Number.isFinite(sellingPrice) && sellingPrice < costPrice) errors.push({ rowNumber: raw.rowNumber, message: 'Selling price is below cost price.' })
    if (name && sku && Number.isFinite(sellingPrice) && Number.isInteger(openingStock) && openingStock >= 0 && (costPrice === null || Number.isFinite(costPrice)) && active !== null)
      valid.push({ rowNumber: raw.rowNumber, name, sku, barcode, category: categoryName, costPrice, sellingPrice, openingStock, ageRestricted: suppliedRestriction ?? false, isActive: active })
  }
  const duplicate = (value: string | null, field: 'SKU' | 'barcode') => valid.filter((row) => row[field === 'SKU' ? 'sku' : 'barcode'] === value).length > 1
  for (const row of valid) {
    if (duplicate(row.sku, 'SKU')) errors.push({ rowNumber: row.rowNumber, message: `Duplicate SKU in file: ${row.sku}` })
    if (row.barcode && duplicate(row.barcode, 'barcode')) errors.push({ rowNumber: row.rowNumber, message: `Duplicate barcode in file: ${row.barcode}` })
  }
  const clean = valid.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber))
  const [categories, existingSkus, existingBarcodes] = await Promise.all([
    db.select({ id: category.id, name: category.name, parentCategoryId: category.parentCategoryId, requiresAgeVerification: category.requiresAgeVerification }).from(category).where(and(eq(category.orgId, auth.organizationId), eq(category.isActive, true))),
    clean.length ? db.select({ sku: product.sku }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.sku, clean.map((row) => row.sku)))) : [],
    clean.some((row) => row.barcode) ? db.select({ barcode: product.barcode }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.barcode, clean.flatMap((row) => row.barcode ? [row.barcode] : [])))) : [],
  ])
  const categoryByName = new Map(categories.filter((item) => item.parentCategoryId).map((item) => [item.name.trim().toLowerCase(), item.id]))
  const restrictedByName = new Map(categories.map((item) => [item.name.trim().toLowerCase(), item.requiresAgeVerification === true]))
  const skuSet = new Set(existingSkus.map((item) => item.sku)); const barcodeSet = new Set(existingBarcodes.map((item) => item.barcode))
  for (const row of clean) {
    if (!categoryByName.has(row.category.toLowerCase())) errors.push({ rowNumber: row.rowNumber, message: 'Category requires review.' })
    else row.ageRestricted = restrictedByName.get(row.category.toLowerCase()) ?? row.ageRestricted
    if (skuSet.has(row.sku)) errors.push({ rowNumber: row.rowNumber, message: `SKU already exists in this organization: ${row.sku}` })
    if (row.barcode && barcodeSet.has(row.barcode)) errors.push({ rowNumber: row.rowNumber, message: `Barcode already exists in this organization: ${row.barcode}` })
  }
  return { auth, categoryByName, valid: clean.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber)), errors }
}

export async function previewProductImport(input: z.input<typeof requestSchema>): Promise<ProductImportPreview> {
  const data = requestSchema.parse(input); const result = await validate(data)
  const validByRow = new Map(result.valid.map((row) => [row.rowNumber, row]))
  const rows = data.rows.map((raw): ProductImportRow => { const ready = validByRow.get(raw.rowNumber); const issue = result.errors.find((item) => item.rowNumber === raw.rowNumber)?.message ?? null; const status: ProductImportStatus = ready ? 'READY' : issue?.startsWith('Excluded:') ? 'EXCLUDED' : issue?.includes('Duplicate') || issue?.includes('already exists') ? 'DUPLICATE' : issue?.includes('Category requires review') ? 'REVIEW_REQUIRED' : 'INVALID'; return { rowNumber: raw.rowNumber, sku: raw.sku.trim(), name: raw.name.trim(), category: ready?.category ?? raw.category.trim(), sellingPrice: Number.isFinite(decimal(raw.sellingPrice)) ? decimal(raw.sellingPrice) : null, barcode: normalizeBarcode(raw.barcode || '') || null, openingStock: raw.openingStock.trim() === '' ? 0 : Number.isFinite(decimal(raw.openingStock)) ? decimal(raw.openingStock) : null, status, issue } })
  const counts = Object.fromEntries(PRODUCT_IMPORT_STATUSES.map((status) => [status, rows.filter((row) => row.status === status).length])) as Record<ProductImportStatus, number>
  return { totalRows: rows.length, validRows: counts.READY, invalidRows: counts.INVALID, warnings: result.valid.filter((row) => !row.barcode).map((row) => `Row ${row.rowNumber}: no barcode; it can be scanned and assigned later.`), errors: result.errors, rows, counts }
}

export async function importProductsFromCsv(input: z.input<typeof requestSchema>) {
  const data = requestSchema.parse(input); const result = await validate(data)
  if (!result.valid.length) throw new Error('No ready products to import. Resolve review rows and correct invalid rows first.')
  const preview = await previewProductImport(data)
  let created = 0
  let racedDuplicates = 0
  await db.transaction(async (tx) => {
    for (const row of result.valid) {
      const id = generateId()
      const inserted = await tx.insert(product).values({ id, name: row.name, sku: row.sku, barcode: row.barcode, categoryId: result.categoryByName.get(row.category.toLowerCase())!, buyingPrice: row.costPrice === null ? sql`NULL` : String(row.costPrice), sellingPrice: String(row.sellingPrice), minStock: 0, unit: 'pcs', requiresAgeVerification: row.ageRestricted, isActive: row.isActive, userId: result.auth.userId, orgId: result.auth.organizationId }).onConflictDoNothing().returning({ id: product.id })
      if (!inserted.length) { racedDuplicates += 1; continue }
      created += 1
      if (row.openingStock > 0 && row.costPrice !== null) {
        await applyInventoryMovement(tx, { productId: id, productName: row.name, branchId: data.branchId, quantity: row.openingStock, type: 'opening_stock', referenceType: 'product_import', referenceId: id, reason: 'CSV catalogue opening stock', userId: result.auth.userId, orgId: result.auth.organizationId, unitCost: row.costPrice })
        await addCostLayer(tx, { productId: id, branchId: data.branchId, sourceType: 'product_import', sourceId: id, quantity: row.openingStock, unitCost: row.costPrice, orgId: result.auth.organizationId })
      }
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: result.auth.organizationId, userId: result.auth.userId, action: 'products.csv_imported', metadata: { branchId: data.branchId, count: result.valid.length, rows: result.valid.map((row) => row.rowNumber) } })
  })
  await Promise.all([invalidateProductReadCache(result.auth.organizationId), invalidateCategoryCache(result.auth.organizationId)])
  revalidatePath('/dashboard/products'); revalidatePath('/dashboard/inventory'); revalidatePath('/dashboard/pos')
  return { success: true, imported: created, duplicates: preview.counts.DUPLICATE + racedDuplicates, reviewRequired: preview.counts.REVIEW_REQUIRED, excluded: preview.counts.EXCLUDED, invalid: preview.counts.INVALID }
}
