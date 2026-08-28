'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/authorization'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { db } from '@/lib/db'
import { auditEvent, branch, inventoryBalance, product, productPackage, stockIntake, stockIntakeItem, user } from '@/lib/db/schema'
import { addCostLayer, applyInventoryMovement } from '@/lib/inventory/inventory-service'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'

const intakeSchema = z.object({
  branchId: z.string().min(1),
  externalReference: z.string().trim().max(120).optional(),
  sourceName: z.string().trim().max(120).optional(),
  sourceType: z.enum(['new_stock', 'opening_stock', 'other']).default('new_stock'),
  notes: z.string().trim().max(500).optional(),
  receivedAt: z.coerce.date(),
  idempotencyKey: z.string().min(16).max(160),
  items: z.array(z.object({
    productId: z.string().min(1),
    packageId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().positive().max(1_000_000),
    unitCost: z.coerce.number().nonnegative().max(1_000_000_000).optional(),
  })).min(1).max(100),
})

export type StockIntakeInput = z.input<typeof intakeSchema>

export async function getStockIntakePageData() {
  const authorization = await requirePermission(PermissionEnum.INVENTORY_VIEW)
  const orgId = authorization.organizationId
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length ? inArray(branch.id, authorization.branchIds) : sql`false`
  const intakeBranchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length ? inArray(stockIntake.branchId, authorization.branchIds) : sql`false`
  const [intakes, branches, products, packages, balances] = await Promise.all([
    db.select().from(stockIntake).where(and(eq(stockIntake.orgId, orgId), intakeBranchScope)).orderBy(desc(stockIntake.receivedAt)).limit(200),
    db.select({ id: branch.id, name: branch.name, isMain: branch.isMain }).from(branch).where(and(eq(branch.organizationId, orgId), branchScope)).orderBy(desc(branch.isMain), branch.name),
    db.select({ id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, unit: product.unit, buyingPrice: product.buyingPrice, trackingMode: product.trackingMode }).from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(product.name),
    db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), eq(productPackage.isActive, true))).orderBy(productPackage.baseUnitQuantity),
    db.select().from(inventoryBalance).where(eq(inventoryBalance.orgId, orgId)),
  ])
  // Keep branch-scoped users from receiving line data for intakes they cannot see.
  const intakeIds = intakes.map((record) => record.id)
  const items = intakeIds.length
    ? await db.select().from(stockIntakeItem).where(and(eq(stockIntakeItem.orgId, orgId), inArray(stockIntakeItem.intakeId, intakeIds)))
    : []
  const creatorIds = [...new Set(intakes.map((record) => record.createdBy))]
  const staff = creatorIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, creatorIds))
    : []
  return { intakes, items, branches, products, packages, balances, staff }
}

export async function getStockIntakeSummary() {
  const authorization = await requirePermission(PermissionEnum.INVENTORY_VIEW)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length ? inArray(stockIntake.branchId, authorization.branchIds) : sql`false`
  const [rows] = await db.select({
    intakes: sql<number>`count(distinct ${stockIntake.id})`,
    units: sql<number>`coalesce(sum(${stockIntakeItem.baseQuantity}), 0)`,
    value: sql<string>`coalesce(sum(${stockIntakeItem.totalCost}), 0)`,
  }).from(stockIntake).innerJoin(stockIntakeItem, eq(stockIntakeItem.intakeId, stockIntake.id))
    .where(and(eq(stockIntake.orgId, authorization.organizationId), branchScope, gte(stockIntake.receivedAt, start), lt(stockIntake.receivedAt, new Date(start.getTime() + 86_400_000))))
  return { intakes: Number(rows?.intakes ?? 0), units: Number(rows?.units ?? 0), value: Number(rows?.value ?? 0) }
}

export async function confirmStockIntake(input: StockIntakeInput) {
  const data = intakeSchema.parse(input)
  const authorization = await requirePermission(PermissionEnum.INVENTORY_RECEIVE)
  const { organizationId: orgId, userId } = authorization
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(data.branchId)) throw new Error('You do not have access to this inventory location')
  if (data.receivedAt.getTime() > Date.now() + 5 * 60_000) throw new Error('Date received cannot be in the future')
  if (new Set(data.items.map((item) => item.productId)).size !== data.items.length) throw new Error('Add each stock item only once per intake')

  const productIds = data.items.map((item) => item.productId)
  const packageIds = data.items.flatMap((item) => item.packageId ? [item.packageId] : [])
  const [[location], catalogue, packageRows] = await Promise.all([
    db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))).limit(1),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true), inArray(product.id, productIds))),
    packageIds.length ? db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), eq(productPackage.isActive, true), inArray(productPackage.id, packageIds))) : [],
  ])
  if (!location) throw new Error('Inventory location not found')
  if (catalogue.length !== productIds.length) throw new Error('One or more stock items are unavailable')
  const productById = new Map(catalogue.map((item) => [item.id, item]))
  const packageById = new Map(packageRows.map((item) => [item.id, item]))
  const lines = data.items.map((line) => {
    const item = productById.get(line.productId)!
    if (item.trackingMode !== 'none') throw new Error(`${item.name} requires batch or serial details and cannot be received through this intake yet`)
    const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
    if (line.packageId && (!selectedPackage || selectedPackage.productId !== item.id)) throw new Error(`The selected package for ${item.name} is unavailable`)
    const conversion = selectedPackage?.baseUnitQuantity ?? 1
    const baseQuantity = line.quantity * conversion
    if (!Number.isSafeInteger(baseQuantity) || baseQuantity > 10_000_000) throw new Error(`The quantity for ${item.name} is too large`)
    const unitCost = line.unitCost === undefined ? Number(item.buyingPrice) : line.unitCost / conversion
    return { ...line, item, selectedPackage, conversion, baseQuantity, unitCost, totalCost: unitCost * baseQuantity }
  })

  const intakeId = generateId()
  const intakeNo = `INT-${Date.now().toString().slice(-8)}-${intakeId.slice(-4).toUpperCase()}`
  const outcome = await db.transaction(async (tx) => {
    const [created] = await tx.insert(stockIntake).values({
      id: intakeId, intakeNo, externalReference: data.externalReference || null, sourceName: data.sourceName || null, sourceType: data.sourceType,
      notes: data.notes || null, status: 'confirmed', receivedAt: data.receivedAt, createdBy: userId, confirmedBy: userId,
      idempotencyKey: data.idempotencyKey, orgId, branchId: location.id,
    }).onConflictDoNothing({ target: [stockIntake.orgId, stockIntake.idempotencyKey] }).returning({ id: stockIntake.id, intakeNo: stockIntake.intakeNo })
    if (!created) {
      const [existing] = await tx.select({ id: stockIntake.id, intakeNo: stockIntake.intakeNo }).from(stockIntake)
        .where(and(eq(stockIntake.orgId, orgId), eq(stockIntake.idempotencyKey, data.idempotencyKey))).limit(1)
      return { ...existing!, duplicate: true }
    }
    for (const line of lines) {
      await applyInventoryMovement(tx, {
        productId: line.item.id, productName: line.item.name, branchId: location.id, quantity: line.baseQuantity,
        type: 'stock_intake', referenceType: 'stock_intake', referenceId: intakeId,
        reason: `${data.sourceType.replace('_', ' ')} · ${intakeNo}${data.externalReference ? ` · ${data.externalReference}` : ''}`,
        userId, orgId, unitCost: line.unitCost,
      })
      await addCostLayer(tx, { productId: line.item.id, branchId: location.id, sourceType: 'stock_intake', sourceId: intakeId, quantity: line.baseQuantity, unitCost: line.unitCost, orgId })
      await tx.insert(stockIntakeItem).values({
        id: generateId(), intakeId, productId: line.item.id, productName: line.item.name, sku: line.item.sku,
        packageId: line.selectedPackage?.id ?? null, enteredQuantity: line.quantity,
        enteredUnit: line.selectedPackage?.name ?? line.item.unit, baseQuantity: line.baseQuantity,
        unitCost: String(line.unitCost), totalCost: String(line.totalCost), orgId,
      })
      if (line.unitCost !== Number(line.item.buyingPrice)) await tx.update(product).set({ buyingPrice: String(line.unitCost), updatedAt: new Date() }).where(and(eq(product.id, line.item.id), eq(product.orgId, orgId)))
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'inventory.stock_intake_confirmed', metadata: { intakeId, intakeNo, branchId: location.id, externalReference: data.externalReference || null, items: lines.map((line) => ({ productId: line.item.id, baseQuantity: line.baseQuantity, unitCost: line.unitCost })) } })
    return { id: intakeId, intakeNo, duplicate: false }
  })
  await invalidateProductReadCache(orgId)
  ;['/dashboard', '/dashboard/inventory', '/dashboard/stock-intake', '/dashboard/inventory/movements', '/dashboard/reports'].forEach((path) => revalidatePath(path))
  return outcome
}
