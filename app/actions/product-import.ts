'use server'

import { and, eq, inArray } from 'drizzle-orm'
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

const rawRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z.string(), sku: z.string(), barcode: z.string().optional(), category: z.string(),
  costPrice: z.string(), sellingPrice: z.string(), openingStock: z.string(), ageRestricted: z.string(),
  isActive: z.string().optional(),
})
const requestSchema = z.object({ branchId: z.string().min(1), rows: z.array(rawRowSchema).min(1).max(500) })
type RawRow = z.infer<typeof rawRowSchema>
type ValidRow = { rowNumber: number; name: string; sku: string; barcode: string | null; category: string; costPrice: number; sellingPrice: number; openingStock: number; ageRestricted: boolean; isActive: boolean }
export type ProductImportPreview = { validRows: number; invalidRows: number; warnings: string[]; errors: Array<{ rowNumber: number; message: string }> }

const bool = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return null
}
const decimal = (value: string) => value.trim() === '' ? Number.NaN : Number(value.replace(/,/g, ''))

async function validate(input: z.infer<typeof requestSchema>) {
  const auth = await requirePermission(PermissionEnum.PRODUCT_CREATE)
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
    const categoryName = raw.category.trim(), costPrice = decimal(raw.costPrice), sellingPrice = decimal(raw.sellingPrice), openingStock = decimal(raw.openingStock)
    const ageRestricted = bool(raw.ageRestricted), active = raw.isActive?.trim() ? bool(raw.isActive) : true
    if (!name || name.length > 180) errors.push({ rowNumber: raw.rowNumber, message: 'Product name is required and must be 180 characters or fewer.' })
    if (!sku || sku.length > 120) errors.push({ rowNumber: raw.rowNumber, message: 'SKU is required and must be 120 characters or fewer.' })
    if (!categoryName || categoryName.length > 80) errors.push({ rowNumber: raw.rowNumber, message: 'Category is required.' })
    if (!Number.isFinite(costPrice) || costPrice < 0) errors.push({ rowNumber: raw.rowNumber, message: 'Cost price must be zero or greater.' })
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) errors.push({ rowNumber: raw.rowNumber, message: 'Selling price must be zero or greater.' })
    if (!Number.isInteger(openingStock) || openingStock < 0) errors.push({ rowNumber: raw.rowNumber, message: 'Opening stock must be a whole number of zero or greater.' })
    if (ageRestricted === null) errors.push({ rowNumber: raw.rowNumber, message: 'ageRestricted must be true or false.' })
    if (active === null) errors.push({ rowNumber: raw.rowNumber, message: 'isActive must be true or false when supplied.' })
    if (Number.isFinite(costPrice) && Number.isFinite(sellingPrice) && sellingPrice < costPrice) errors.push({ rowNumber: raw.rowNumber, message: 'Selling price is below cost price.' })
    if (name && sku && categoryName && Number.isFinite(costPrice) && Number.isFinite(sellingPrice) && Number.isInteger(openingStock) && openingStock >= 0 && ageRestricted !== null && active !== null)
      valid.push({ rowNumber: raw.rowNumber, name, sku, barcode, category: categoryName, costPrice, sellingPrice, openingStock, ageRestricted, isActive: active })
  }
  const duplicate = (value: string | null, field: 'SKU' | 'barcode') => valid.filter((row) => row[field === 'SKU' ? 'sku' : 'barcode'] === value).length > 1
  for (const row of valid) {
    if (duplicate(row.sku, 'SKU')) errors.push({ rowNumber: row.rowNumber, message: `Duplicate SKU in file: ${row.sku}` })
    if (row.barcode && duplicate(row.barcode, 'barcode')) errors.push({ rowNumber: row.rowNumber, message: `Duplicate barcode in file: ${row.barcode}` })
  }
  const clean = valid.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber))
  const [categories, existingSkus, existingBarcodes] = await Promise.all([
    db.select({ id: category.id, name: category.name }).from(category).where(and(eq(category.orgId, auth.organizationId), eq(category.isActive, true))),
    clean.length ? db.select({ sku: product.sku }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.sku, clean.map((row) => row.sku)))) : [],
    clean.some((row) => row.barcode) ? db.select({ barcode: product.barcode }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.barcode, clean.flatMap((row) => row.barcode ? [row.barcode] : [])))) : [],
  ])
  const categoryByName = new Map(categories.map((item) => [item.name.trim().toLowerCase(), item.id]))
  const skuSet = new Set(existingSkus.map((item) => item.sku)); const barcodeSet = new Set(existingBarcodes.map((item) => item.barcode))
  for (const row of clean) {
    if (!categoryByName.has(row.category.toLowerCase())) errors.push({ rowNumber: row.rowNumber, message: `Category not found: ${row.category}` })
    if (skuSet.has(row.sku)) errors.push({ rowNumber: row.rowNumber, message: `SKU already exists in this organization: ${row.sku}` })
    if (row.barcode && barcodeSet.has(row.barcode)) errors.push({ rowNumber: row.rowNumber, message: `Barcode already exists in this organization: ${row.barcode}` })
  }
  return { auth, categoryByName, valid: clean.filter((row) => !errors.some((error) => error.rowNumber === row.rowNumber)), errors }
}

export async function previewProductImport(input: z.input<typeof requestSchema>): Promise<ProductImportPreview> {
  const data = requestSchema.parse(input); const result = await validate(data)
  return { validRows: result.valid.length, invalidRows: new Set(result.errors.map((error) => error.rowNumber)).size, warnings: result.valid.filter((row) => !row.barcode).map((row) => `Row ${row.rowNumber}: no barcode; it can be scanned and assigned later.`), errors: result.errors }
}

export async function importProductsFromCsv(input: z.input<typeof requestSchema>) {
  const data = requestSchema.parse(input); const result = await validate(data)
  if (result.errors.length) throw new Error(result.errors.slice(0, 20).map((error) => `Row ${error.rowNumber}: ${error.message}`).join('\n'))
  await db.transaction(async (tx) => {
    for (const row of result.valid) {
      const id = generateId()
      await tx.insert(product).values({ id, name: row.name, sku: row.sku, barcode: row.barcode, categoryId: result.categoryByName.get(row.category.toLowerCase())!, buyingPrice: String(row.costPrice), sellingPrice: String(row.sellingPrice), minStock: 0, unit: 'pcs', requiresAgeVerification: row.ageRestricted, isActive: row.isActive, userId: result.auth.userId, orgId: result.auth.organizationId })
      if (row.openingStock > 0) {
        await applyInventoryMovement(tx, { productId: id, productName: row.name, branchId: data.branchId, quantity: row.openingStock, type: 'opening_stock', referenceType: 'product_import', referenceId: id, reason: 'CSV catalogue opening stock', userId: result.auth.userId, orgId: result.auth.organizationId, unitCost: row.costPrice })
        await addCostLayer(tx, { productId: id, branchId: data.branchId, sourceType: 'product_import', sourceId: id, quantity: row.openingStock, unitCost: row.costPrice, orgId: result.auth.organizationId })
      }
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: result.auth.organizationId, userId: result.auth.userId, action: 'products.csv_imported', metadata: { branchId: data.branchId, count: result.valid.length, rows: result.valid.map((row) => row.rowNumber) } })
  })
  await Promise.all([invalidateProductReadCache(result.auth.organizationId), invalidateCategoryCache(result.auth.organizationId)])
  revalidatePath('/dashboard/products'); revalidatePath('/dashboard/inventory'); revalidatePath('/dashboard/pos')
  return { success: true, imported: result.valid.length }
}
