import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBalance, inventoryCostLayer, inventoryLot, inventorySerial, product, stockMovement } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'

export type InventoryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type MovementInput = {
  productId: string
  productName: string
  branchId: string
  quantity: number
  type: string
  referenceType: string
  referenceId: string
  reason?: string
  userId: string
  orgId: string
  unitCost?: number
  lotId?: string
  serialId?: string
}

async function ensureBalance(tx: InventoryTransaction, input: Pick<MovementInput, 'productId' | 'branchId' | 'orgId'>) {
  await tx.insert(inventoryBalance).values({
    id: generateId(), productId: input.productId, branchId: input.branchId, orgId: input.orgId,
  }).onConflictDoNothing({ target: [inventoryBalance.productId, inventoryBalance.branchId] })
}

async function synchronizeLegacyTotal(tx: InventoryTransaction, productId: string, orgId: string) {
  const [total] = await tx.select({ stock: sql<number>`coalesce(sum(${inventoryBalance.onHand}), 0)` })
    .from(inventoryBalance).where(and(eq(inventoryBalance.productId, productId), eq(inventoryBalance.orgId, orgId)))
  await tx.update(product).set({ stock: Math.trunc(Number(total?.stock ?? 0)), updatedAt: new Date() })
    .where(and(eq(product.id, productId), eq(product.orgId, orgId)))
}

/** Atomically moves available stock and writes the immutable ledger entry. */
export async function applyInventoryMovement(tx: InventoryTransaction, input: MovementInput) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new Error('Inventory movement quantity must be a non-zero whole number')
  await ensureBalance(tx, input)

  const [updated] = input.quantity > 0
    ? await tx.update(inventoryBalance).set({ onHand: sql`${inventoryBalance.onHand} + ${input.quantity}`, updatedAt: new Date() })
      .where(and(eq(inventoryBalance.productId, input.productId), eq(inventoryBalance.branchId, input.branchId), eq(inventoryBalance.orgId, input.orgId)))
      .returning({ stockAfter: inventoryBalance.onHand })
    : await tx.update(inventoryBalance).set({ onHand: sql`${inventoryBalance.onHand} + ${input.quantity}`, updatedAt: new Date() })
      .where(and(
        eq(inventoryBalance.productId, input.productId), eq(inventoryBalance.branchId, input.branchId), eq(inventoryBalance.orgId, input.orgId),
        sql`${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable} >= ${Math.abs(input.quantity)}`,
      )).returning({ stockAfter: inventoryBalance.onHand })

  if (!updated) throw new Error(`Insufficient available stock for ${input.productName}`)
  const stockAfter = Number(updated.stockAfter)
  const lotAllocations: Array<{ lotId: string; lotNumber: string; expiresAt: Date | null; quantity: number }> = []
  if (input.type === 'sale' && input.quantity < 0) {
    const [tracked] = await tx.select({ trackingMode: product.trackingMode }).from(product).where(and(eq(product.id, input.productId), eq(product.orgId, input.orgId))).limit(1)
    if (tracked?.trackingMode === 'lot') {
      let remaining = Math.abs(input.quantity)
      const lots = await tx.select().from(inventoryLot).where(and(
        eq(inventoryLot.productId, input.productId), eq(inventoryLot.branchId, input.branchId), eq(inventoryLot.orgId, input.orgId),
        eq(inventoryLot.status, 'available'), gt(inventoryLot.quantity, '0'), or(isNull(inventoryLot.expiresAt), gt(inventoryLot.expiresAt, new Date())),
      )).orderBy(asc(inventoryLot.expiresAt), asc(inventoryLot.receivedAt)).for('update')
      for (const lot of lots) {
        const consumed = Math.min(remaining, Number(lot.quantity))
        if (consumed <= 0) continue
        await tx.update(inventoryLot).set({ quantity: sql`${inventoryLot.quantity} - ${consumed}` }).where(eq(inventoryLot.id, lot.id))
        lotAllocations.push({ lotId: lot.id, lotNumber: lot.lotNumber, expiresAt: lot.expiresAt, quantity: consumed })
        remaining -= consumed
        if (!remaining) break
      }
      if (remaining) throw new Error(`${input.productName} has insufficient unexpired lot stock`)
    }
    if (tracked?.trackingMode === 'serial') {
      const required = Math.abs(input.quantity)
      const serials = await tx.select({ id: inventorySerial.id }).from(inventorySerial).where(and(eq(inventorySerial.productId, input.productId), eq(inventorySerial.branchId, input.branchId), eq(inventorySerial.orgId, input.orgId), eq(inventorySerial.status, 'available'))).orderBy(inventorySerial.createdAt).limit(required).for('update')
      if (serials.length !== required) throw new Error(`${input.productName} has insufficient available serial numbers`)
      await tx.update(inventorySerial).set({ status: 'sold', soldAt: new Date(), saleId: input.referenceId, updatedAt: new Date() }).where(inArray(inventorySerial.id, serials.map((serial) => serial.id)))
    }
  }
  await synchronizeLegacyTotal(tx, input.productId, input.orgId)
  await tx.insert(stockMovement).values({
    id: generateId(), productId: input.productId, productName: input.productName, branchId: input.branchId,
    type: input.type, quantity: input.quantity, stockBefore: stockAfter - input.quantity, stockAfter,
    referenceType: input.referenceType, referenceId: input.referenceId, reason: input.reason,
    userId: input.userId, orgId: input.orgId, unitCost: input.unitCost === undefined ? null : String(input.unitCost),
    lotId: input.lotId, serialId: input.serialId,
  })
  return { stockBefore: stockAfter - input.quantity, stockAfter, lotAllocations }
}

export async function addCostLayer(tx: InventoryTransaction, input: {
  productId: string; branchId: string; sourceType: string; sourceId: string; quantity: number; unitCost: number; landedUnitCost?: number; orgId: string
}) {
  if (input.quantity <= 0 || input.unitCost < 0) throw new Error('Invalid inventory cost layer')
  await tx.insert(inventoryCostLayer).values({
    id: generateId(), productId: input.productId, branchId: input.branchId, sourceType: input.sourceType, sourceId: input.sourceId,
    quantityReceived: String(input.quantity), quantityRemaining: String(input.quantity), unitCost: String(input.unitCost),
    landedUnitCost: String(input.landedUnitCost ?? input.unitCost), orgId: input.orgId,
  })
}

export async function reserveInventory(tx: InventoryTransaction, input: { productId: string; branchId: string; orgId: string; quantity: number }) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('Reservation quantity must be positive')
  await ensureBalance(tx, input)
  const [reserved] = await tx.update(inventoryBalance).set({ reserved: sql`${inventoryBalance.reserved} + ${input.quantity}`, updatedAt: new Date() })
    .where(and(eq(inventoryBalance.productId, input.productId), eq(inventoryBalance.branchId, input.branchId), eq(inventoryBalance.orgId, input.orgId), sql`${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable} >= ${input.quantity}`))
    .returning({ id: inventoryBalance.id })
  if (!reserved) throw new Error('Insufficient available stock to reserve')
}

export async function releaseReservation(tx: InventoryTransaction, input: { productId: string; branchId: string; orgId: string; quantity: number }) {
  const [released] = await tx.update(inventoryBalance).set({ reserved: sql`${inventoryBalance.reserved} - ${input.quantity}`, updatedAt: new Date() })
    .where(and(eq(inventoryBalance.productId, input.productId), eq(inventoryBalance.branchId, input.branchId), eq(inventoryBalance.orgId, input.orgId), sql`${inventoryBalance.reserved} >= ${input.quantity}`))
    .returning({ id: inventoryBalance.id })
  if (!released) throw new Error('Reservation is no longer available')
}

export async function adjustIncoming(tx: InventoryTransaction, input: { productId: string; branchId: string; orgId: string; quantity: number }) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new Error('Incoming quantity must be a non-zero whole number')
  await ensureBalance(tx, input)
  const [updated] = await tx.update(inventoryBalance).set({ incoming: sql`${inventoryBalance.incoming} + ${input.quantity}`, updatedAt: new Date() })
    .where(and(eq(inventoryBalance.productId, input.productId), eq(inventoryBalance.branchId, input.branchId), eq(inventoryBalance.orgId, input.orgId), sql`${inventoryBalance.incoming} + ${input.quantity} >= 0`))
    .returning({ id: inventoryBalance.id })
  if (!updated) throw new Error('Incoming stock changed; refresh and try again')
}

/** Consumes FIFO valuation layers and returns the cost recognized by a sale.
 * Legacy/opening quantities without a layer use the product's current standard cost. */
export async function consumeInventoryCost(tx: InventoryTransaction, input: { productId: string; branchId: string; orgId: string; quantity: number }) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('Cost quantity must be a positive whole number')
  const layers = await tx.select().from(inventoryCostLayer).where(and(eq(inventoryCostLayer.productId, input.productId), eq(inventoryCostLayer.branchId, input.branchId), eq(inventoryCostLayer.orgId, input.orgId), gt(inventoryCostLayer.quantityRemaining, '0'))).orderBy(inventoryCostLayer.receivedAt).for('update')
  let remaining = input.quantity, totalCost = 0
  for (const layer of layers) {
    const consumed = Math.min(remaining, Number(layer.quantityRemaining))
    if (!consumed) continue
    totalCost += consumed * Number(layer.landedUnitCost)
    await tx.update(inventoryCostLayer).set({ quantityRemaining: sql`${inventoryCostLayer.quantityRemaining} - ${consumed}` }).where(eq(inventoryCostLayer.id, layer.id))
    remaining -= consumed
    if (!remaining) break
  }
  if (remaining) {
    const [item] = await tx.select({ cost: product.buyingPrice }).from(product).where(and(eq(product.id, input.productId), eq(product.orgId, input.orgId))).limit(1)
    if (!item) throw new Error('Product cost is unavailable')
    totalCost += remaining * Number(item.cost)
  }
  return { totalCost, unitCost: totalCost / input.quantity }
}
