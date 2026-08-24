'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { auditEvent, branch, category, inventoryLot, pharmacyProduct, product } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { addCostLayer, applyInventoryMovement } from '@/lib/inventory/inventory-service'
import { generateId, normalizeBarcode } from '@/lib/utils'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'

const rowSchema = z.object({
  rowNumber: z.number().int().positive(), name: z.string().trim().min(2).max(180), genericName: z.string().trim().max(180).optional(), brand: z.string().trim().max(120).optional(), sku: z.string().trim().min(1).max(120), barcode: z.string().trim().max(120).optional(), category: z.string().trim().min(1).max(120), buyingPrice: z.number().positive(), sellingPrice: z.number().nonnegative(), minStock: z.number().int().nonnegative(), unit: z.string().trim().min(1).max(40), manufacturer: z.string().trim().max(160).optional(), strength: z.string().trim().max(80).optional(), dosageForm: z.string().trim().max(80).optional(), packSize: z.string().trim().max(80).optional(), prescriptionRequired: z.boolean(), restrictedItem: z.boolean(), branchCode: z.string().trim().max(80).optional(), openingStock: z.number().int().nonnegative(), lotNumber: z.string().trim().max(120).optional(), batchBarcode: z.string().trim().max(120).optional(), expiryDate: z.string().trim().optional(), etimsItemCode: z.string().trim().max(120).optional(), etimsUnitCode: z.string().trim().max(80).optional(), etimsTaxRate: z.number().min(0).max(100).optional(),
}).superRefine((row, ctx) => { if (row.openingStock > 0) { if (!row.branchCode) ctx.addIssue({ code: 'custom', path: ['branchCode'], message: 'Branch code is required for opening stock' }); if (!row.lotNumber) ctx.addIssue({ code: 'custom', path: ['lotNumber'], message: 'Batch number is required for opening stock' }); const expiry = row.expiryDate ? new Date(`${row.expiryDate}T23:59:59.000Z`) : null; if (!expiry || Number.isNaN(expiry.getTime()) || expiry <= new Date()) ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'A future expiry date is required for opening stock' }) } })
const importSchema = z.array(rowSchema).min(1).max(500)

export async function importPharmacyMedicines(input: z.input<typeof importSchema>) {
  const rows = importSchema.parse(input)
  const auth = await requirePermission(PermissionEnum.PRODUCT_CREATE)
  const workspace = await WorkspaceService.getWorkspaceConfig(auth.organizationId, auth.userId)
  if (!workspace || !isPharmacyBusiness(workspace.businessType, workspace.businessCategory)) throw new Error('Medicine import is available only in pharmacy workspaces')
  const normalized = rows.map((row) => ({ ...row, sku: row.sku.toUpperCase(), barcode: normalizeBarcode(row.barcode || '') || undefined, categoryKey: row.category.toLowerCase(), branchKey: row.branchCode?.toLowerCase() }))
  const duplicates = (values: Array<string | undefined>) => values.filter((value): value is string => Boolean(value)).filter((value, index, list) => list.indexOf(value) !== index)
  if (duplicates(normalized.map((row) => row.sku)).length) throw new Error('The import contains duplicate SKUs')
  if (duplicates(normalized.map((row) => row.barcode)).length) throw new Error('The import contains duplicate barcodes')
  const [categories, branches, existingSku, existingBarcode] = await Promise.all([
    db.select({ id: category.id, name: category.name }).from(category).where(and(eq(category.orgId, auth.organizationId), eq(category.isActive, true))),
    db.select({ id: branch.id, code: branch.code, name: branch.name }).from(branch).where(eq(branch.organizationId, auth.organizationId)),
    db.select({ sku: product.sku }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.sku, normalized.map((row) => row.sku)))),
    normalized.some((row) => row.barcode) ? db.select({ barcode: product.barcode }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.barcode, normalized.map((row) => row.barcode).filter((value): value is string => Boolean(value))))) : [],
  ])
  if (existingSku.length) throw new Error(`SKU already exists: ${existingSku.map((row) => row.sku).join(', ')}`)
  if (existingBarcode.length) throw new Error(`Barcode already exists: ${existingBarcode.map((row) => row.barcode).join(', ')}`)
  const categoryByName = new Map(categories.map((item) => [item.name.toLowerCase(), item.id]))
  const branchByCode = new Map(branches.flatMap((item) => [[item.code.toLowerCase(), item.id], [item.name.toLowerCase(), item.id]] as Array<[string, string]>))
  const errors = normalized.flatMap((row) => { const messages: string[] = []; if (!categoryByName.has(row.categoryKey)) messages.push(`category "${row.category}" was not found`); if (row.openingStock > 0 && !branchByCode.has(row.branchKey || '')) messages.push(`branch "${row.branchCode}" was not found`); if (row.sellingPrice < row.buyingPrice) messages.push('selling price is below cost'); return messages.map((message) => `Row ${row.rowNumber}: ${message}`) })
  if (errors.length) throw new Error(errors.slice(0, 20).join('\n'))
  await db.transaction(async (tx) => {
    for (const row of normalized) {
      const productId = generateId()
      await tx.insert(product).values({ id: productId, name: row.name, brand: row.brand || null, sku: row.sku, barcode: row.barcode || null, categoryId: categoryByName.get(row.categoryKey)!, buyingPrice: String(row.buyingPrice), sellingPrice: String(row.sellingPrice), stock: 0, minStock: row.minStock, unit: row.unit, trackingMode: 'lot', etimsItemCode: row.etimsItemCode || null, etimsUnitCode: row.etimsUnitCode || null, etimsTaxRate: row.etimsTaxRate === undefined ? null : String(row.etimsTaxRate), userId: auth.userId, orgId: auth.organizationId })
      await tx.insert(pharmacyProduct).values({ productId, organizationId: auth.organizationId, genericName: row.genericName || null, manufacturer: row.manufacturer || null, strength: row.strength || null, dosageForm: row.dosageForm || null, packSize: row.packSize || null, prescriptionRequired: row.prescriptionRequired, restrictedItem: row.restrictedItem })
      if (row.openingStock > 0) {
        const branchId = branchByCode.get(row.branchKey!)!
        const lotId = generateId()
        await applyInventoryMovement(tx, { productId, productName: row.name, branchId, quantity: row.openingStock, type: 'opening_stock', referenceType: 'pharmacy_import', referenceId: productId, reason: `Imported batch ${row.lotNumber}`, userId: auth.userId, orgId: auth.organizationId, unitCost: row.buyingPrice })
        await tx.insert(inventoryLot).values({ id: lotId, productId, branchId, lotNumber: row.lotNumber!, barcode: row.batchBarcode || null, quantity: String(row.openingStock), expiresAt: new Date(`${row.expiryDate}T23:59:59.000Z`), unitCost: String(row.buyingPrice), status: 'available', orgId: auth.organizationId })
        await addCostLayer(tx, { productId, branchId, sourceType: 'pharmacy_import', sourceId: productId, quantity: row.openingStock, unitCost: row.buyingPrice, orgId: auth.organizationId })
      }
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: auth.organizationId, userId: auth.userId, action: 'pharmacy.medicines_imported', metadata: { count: normalized.length, rows: normalized.map((row) => row.rowNumber) } })
  })
  await invalidateProductReadCache(auth.organizationId)
  revalidatePath('/dashboard/products'); revalidatePath('/dashboard/inventory'); revalidatePath('/dashboard/pos')
  return { success: true, imported: normalized.length }
}
