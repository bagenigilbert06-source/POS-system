import { and, eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { notificationAlertState, notificationEvent } from '@/lib/db/schema'
import type { InventoryTransaction } from '@/lib/inventory/inventory-service'

type StockAlertInput = {
  organizationId: string; branchId: string; productId: string; productName: string
  stockBefore: number; stockAfter: number; reorderPoint: number
}

/** Records stock episodes inside the inventory transaction; delivery happens later. */
export async function recordInventoryAlerts(tx: InventoryTransaction, input: StockAlertInput) {
  await tx.insert(notificationAlertState).values({
    id: generateId(), organizationId: input.organizationId, branchId: input.branchId, productId: input.productId,
  }).onConflictDoNothing({ target: [notificationAlertState.productId, notificationAlertState.branchId] })
  const [state] = await tx.select().from(notificationAlertState).where(and(
    eq(notificationAlertState.organizationId, input.organizationId), eq(notificationAlertState.branchId, input.branchId), eq(notificationAlertState.productId, input.productId),
  )).limit(1).for('update')
  if (!state) return
  const base = { organizationId: input.organizationId, branchId: input.branchId, entityType: 'inventory_balance', entityId: input.productId,
    payload: { productId: input.productId, productName: input.productName, availableStock: input.stockAfter, reorderPoint: input.reorderPoint } }
  if (input.stockAfter > input.reorderPoint) {
    await tx.update(notificationAlertState).set({ lowStockActive: false, outOfStockActive: false, updatedAt: new Date() }).where(eq(notificationAlertState.id, state.id))
    return
  }
  if (input.stockAfter > 0) {
    if (state.outOfStockActive) await tx.update(notificationAlertState).set({ outOfStockActive: false, updatedAt: new Date() }).where(eq(notificationAlertState.id, state.id))
    if (input.stockBefore > input.reorderPoint && !state.lowStockActive) {
      const episode = state.lowStockEpisode + 1
      await tx.insert(notificationEvent).values({ id: generateId(), ...base, type: 'LOW_STOCK', severity: 'WARNING', dedupeKey: `low-stock:${state.id}:${episode}` }).onConflictDoNothing()
      await tx.update(notificationAlertState).set({ lowStockActive: true, lowStockEpisode: episode, updatedAt: new Date() }).where(eq(notificationAlertState.id, state.id))
    }
    return
  }
  if (input.stockBefore > 0 && !state.outOfStockActive) {
    const episode = state.outOfStockEpisode + 1
    await tx.insert(notificationEvent).values({ id: generateId(), ...base, type: 'OUT_OF_STOCK', severity: 'CRITICAL', dedupeKey: `out-of-stock:${state.id}:${episode}` }).onConflictDoNothing()
    // Direct healthy -> zero emits only the critical alert but still marks the
    // low-stock episode active, preventing a duplicate low alert on partial restock.
    await tx.update(notificationAlertState).set({ lowStockActive: true, outOfStockActive: true, outOfStockEpisode: episode, updatedAt: new Date() }).where(eq(notificationAlertState.id, state.id))
  }
}

/** Re-evaluates availability-only changes (quarantine, recall, release) using the same state machine. */
export async function evaluateInventoryAlerts(tx: InventoryTransaction, input: Omit<StockAlertInput, 'stockBefore'>) {
  return recordInventoryAlerts(tx, { ...input, stockBefore: Number.MAX_SAFE_INTEGER })
}
