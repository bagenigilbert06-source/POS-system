'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { branch, product, purchase, purchaseItem, stockMovement, supplier, supplierProduct } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { addCostLayer, applyInventoryMovement } from '@/lib/inventory/inventory-service'

async function context(permission: PermissionEnum) {
  const authorization = await requirePermission(permission)
  return { userId: authorization.userId, orgId: authorization.organizationId, authorization }
}

const supplierSchema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal('')), taxId: z.string().trim().max(50).optional(), address: z.string().trim().max(180).optional(), contactPerson: z.string().trim().max(120).optional(), paymentTermsDays: z.coerce.number().int().nonnegative().max(365).default(0), leadTimeDays: z.coerce.number().int().nonnegative().max(365).default(0), notes: z.string().trim().max(500).optional() })
const supplierProductSchema = z.object({ supplierId: z.string().min(1), productId: z.string().min(1), supplierCode: z.string().trim().max(100).optional(), unitCost: z.coerce.number().nonnegative(), minimumOrderQuantity: z.coerce.number().positive(), leadTimeDays: z.coerce.number().int().nonnegative(), packSize: z.coerce.number().positive(), isPreferred: z.boolean().default(false) })
const receiptSchema = z.object({ supplierId: z.string().min(1), productId: z.string().min(1), branchId: z.string().min(1), quantity: z.coerce.number().int().positive().max(1_000_000), unitCost: z.coerce.number().nonnegative().max(999_999_999), reference: z.string().trim().max(80).optional(), paymentStatus: z.enum(['unpaid', 'partial', 'paid']), notes: z.string().trim().max(500).optional() })

export async function getProcurementData() {
  const { orgId, authorization } = await context(PermissionEnum.PURCHASE_VIEW)
  const [suppliers, purchases, products, movements, branches, supplierProducts] = await Promise.all([
    db.select().from(supplier).where(eq(supplier.orgId, orgId)).orderBy(desc(supplier.createdAt)),
    db.select().from(purchase).where(eq(purchase.orgId, orgId)).orderBy(desc(purchase.createdAt)).limit(100),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(product.name),
    db.select().from(stockMovement).where(eq(stockMovement.orgId, orgId)).orderBy(desc(stockMovement.createdAt)).limit(20),
    db.select().from(branch).where(and(eq(branch.organizationId, orgId), authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds.length ? authorization.branchIds : ['']))).orderBy(desc(branch.isMain), branch.name),
    db.select().from(supplierProduct).where(eq(supplierProduct.orgId, orgId)),
  ])
  return { suppliers, purchases, products, movements, branches, supplierProducts }
}

export async function updateSupplier(id: string, input: z.input<typeof supplierSchema>) {
  const supplierId = z.string().min(1).parse(id), data = supplierSchema.parse(input)
  const { orgId } = await context(PermissionEnum.PURCHASE_MANAGE)
  const [updated] = await db.update(supplier).set({ ...data, email: data.email || null, updatedAt: new Date() }).where(and(eq(supplier.id, supplierId), eq(supplier.orgId, orgId))).returning({ id: supplier.id })
  if (!updated) throw new Error('Supplier not found')
  revalidatePath('/dashboard/purchases'); revalidatePath('/dashboard/inventory')
}

export async function setSupplierStatus(id: string, status: 'active' | 'inactive') {
  const supplierId = z.string().min(1).parse(id), next = z.enum(['active', 'inactive']).parse(status)
  const { orgId } = await context(PermissionEnum.PURCHASE_MANAGE)
  const [updated] = await db.update(supplier).set({ status: next, updatedAt: new Date() }).where(and(eq(supplier.id, supplierId), eq(supplier.orgId, orgId))).returning({ id: supplier.id })
  if (!updated) throw new Error('Supplier not found')
  revalidatePath('/dashboard/purchases'); revalidatePath('/dashboard/inventory')
}

export async function upsertSupplierProduct(input: z.input<typeof supplierProductSchema>) {
  const data = supplierProductSchema.parse(input), { orgId } = await context(PermissionEnum.PURCHASE_MANAGE)
  const [[vendor], [item]] = await Promise.all([
    db.select({ id: supplier.id }).from(supplier).where(and(eq(supplier.id, data.supplierId), eq(supplier.orgId, orgId))).limit(1),
    db.select({ id: product.id }).from(product).where(and(eq(product.id, data.productId), eq(product.orgId, orgId))).limit(1),
  ])
  if (!vendor || !item) throw new Error('Supplier or product not found')
  await db.transaction(async (tx) => {
    if (data.isPreferred) await tx.update(supplierProduct).set({ isPreferred: false }).where(and(eq(supplierProduct.productId, data.productId), eq(supplierProduct.orgId, orgId)))
    await tx.insert(supplierProduct).values({ id: generateId(), ...data, unitCost: String(data.unitCost), minimumOrderQuantity: String(data.minimumOrderQuantity), packSize: String(data.packSize), orgId }).onConflictDoUpdate({ target: [supplierProduct.supplierId, supplierProduct.productId], set: { supplierCode: data.supplierCode, unitCost: String(data.unitCost), minimumOrderQuantity: String(data.minimumOrderQuantity), leadTimeDays: data.leadTimeDays, packSize: String(data.packSize), isPreferred: data.isPreferred, updatedAt: new Date() } })
    if (data.isPreferred) await tx.update(product).set({ preferredSupplierId: data.supplierId, updatedAt: new Date() }).where(and(eq(product.id, data.productId), eq(product.orgId, orgId)))
  })
  revalidatePath('/dashboard/purchases'); revalidatePath('/dashboard/inventory')
}

export async function createSupplier(input: z.input<typeof supplierSchema>) {
  const data = supplierSchema.parse(input)
  const { userId, orgId } = await context(PermissionEnum.PURCHASE_MANAGE)
  await db.insert(supplier).values({ id: generateId(), ...data, email: data.email || null, userId, orgId })
  revalidatePath('/dashboard/purchases')
}

export async function receivePurchase(input: z.input<typeof receiptSchema>) {
  const data = receiptSchema.parse(input)
  const { userId, orgId, authorization } = await context(PermissionEnum.PURCHASE_MANAGE)
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(data.branchId)) throw new Error('You do not have access to this receiving location')
  await db.transaction(async (tx) => {
    const [[vendor], [item]] = await Promise.all([
      tx.select().from(supplier).where(and(eq(supplier.id, data.supplierId), eq(supplier.orgId, orgId))).limit(1),
      tx.select().from(product).where(and(eq(product.id, data.productId), eq(product.orgId, orgId))).limit(1),
    ])
    if (!vendor || !item) throw new Error('Supplier or product was not found')
    if (item.trackingMode !== 'none') throw new Error('Receive lot- or serial-tracked products through a confirmed purchase order')
    const [location] = await tx.select({ id: branch.id }).from(branch).where(and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))).limit(1)
    if (!location) throw new Error('Receiving location was not found')
    const purchaseId = generateId()
    const total = data.quantity * data.unitCost
    const purchaseNo = `PO-${Date.now().toString().slice(-8)}`
    await tx.insert(purchase).values({ id: purchaseId, purchaseNo, supplierId: vendor.id, supplierName: vendor.name, reference: data.reference || null, subtotal: String(total), total: String(total), paymentStatus: data.paymentStatus, status: 'received', notes: data.notes || null, userId, orgId })
    await tx.insert(purchaseItem).values({ id: generateId(), purchaseId, productId: item.id, productName: item.name, quantity: data.quantity, unitCost: String(data.unitCost), totalCost: String(total), orgId })
    await applyInventoryMovement(tx, { productId: item.id, productName: item.name, branchId: location.id, quantity: data.quantity, type: 'purchase_receipt', referenceType: 'purchase', referenceId: purchaseId, reason: data.reference || purchaseNo, userId, orgId, unitCost: data.unitCost })
    await addCostLayer(tx, { productId: item.id, branchId: location.id, sourceType: 'purchase', sourceId: purchaseId, quantity: data.quantity, unitCost: data.unitCost, orgId })
    await tx.update(product).set({ buyingPrice: String(data.unitCost), updatedAt: new Date() }).where(and(eq(product.id, item.id), eq(product.orgId, orgId)))
  })
  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/purchases')
  revalidatePath('/dashboard/reports')
}
