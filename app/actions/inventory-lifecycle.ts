'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  branch,
  inventoryLot,
  inventoryTransfer,
  inventoryTransferItem,
  inventoryTransferLotAllocation,
  pharmacyProduct,
  product,
} from '@/lib/db/schema';
import { requirePermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import {
  adjustIncoming,
  applyInventoryMovement,
  releaseReservation,
  reserveInventory,
} from '@/lib/inventory/inventory-service';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import { generateId } from '@/lib/utils';
import { planTransferLotReceipt } from '@/lib/pharmacy/transfer-rules';

const transferLine = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(1_000_000),
});
const createTransferSchema = z
  .object({
    fromBranchId: z.string().min(1),
    toBranchId: z.string().min(1),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(transferLine).min(1).max(500),
  })
  .refine(
    (value) => value.fromBranchId !== value.toBranchId,
    'Choose different source and destination locations'
  );
const receiveTransferSchema = z.object({
  transferId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(100),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        receivedQuantity: z.coerce.number().int().nonnegative(),
        rejectedQuantity: z.coerce.number().int().nonnegative().default(0),
      })
    )
    .min(1),
});

async function lifecycleContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission);
  return {
    authorization,
    userId: authorization.userId,
    orgId: authorization.organizationId,
  };
}

function assertBranchAccess(
  authorization: Awaited<ReturnType<typeof requirePermission>>,
  ...branchIds: string[]
) {
  if (
    !authorization.isOrganizationWide &&
    branchIds.some((id) => !authorization.branchIds.includes(id))
  )
    throw new Error('You do not have access to this inventory location');
}

function refreshInventory() {
  for (const path of [
    '/dashboard',
    '/dashboard/inventory',
    '/dashboard/stock-intake',
    '/dashboard/products',
    '/dashboard/reports',
  ])
    revalidatePath(path);
}

export async function getInventoryLifecycleData() {
  const { authorization, orgId } = await lifecycleContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const [transfers, transferItems, branches] = await Promise.all([
    db.select().from(inventoryTransfer).where(eq(inventoryTransfer.orgId, orgId)).orderBy(desc(inventoryTransfer.createdAt)).limit(100),
    db.select().from(inventoryTransferItem).where(eq(inventoryTransferItem.orgId, orgId)),
    db
      .select()
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(branch.id, authorization.branchIds.length ? authorization.branchIds : [''])
        )
      )
      .orderBy(asc(branch.name)),
  ]);
  return { transfers, transferItems, branches };
}

export async function createInventoryTransfer(
  input: z.input<typeof createTransferSchema>
) {
  const data = createTransferSchema.parse(input);
  const { authorization, userId, orgId } = await lifecycleContext(
    PermissionEnum.INVENTORY_TRANSFER
  );
  assertBranchAccess(authorization, data.fromBranchId, data.toBranchId);
  if (
    new Set(data.items.map((item) => item.productId)).size !== data.items.length
  )
    throw new Error('Each product can appear only once');
  const [locations, products] = await Promise.all([
    db
      .select({ id: branch.id })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          inArray(branch.id, [data.fromBranchId, data.toBranchId])
        )
      ),
    db
      .select()
      .from(product)
      .where(
        and(
          eq(product.orgId, orgId),
          eq(product.isActive, true),
          inArray(
            product.id,
            data.items.map((item) => item.productId)
          )
        )
      ),
  ]);
  if (locations.length !== 2 || products.length !== data.items.length)
    throw new Error('A transfer location or product is unavailable');
  const byId = new Map(products.map((item) => [item.id, item])),
    id = generateId(),
    transferNo = `TR-${Date.now().toString(36).toUpperCase()}`;
  await db.transaction(async (tx) => {
    await tx
      .insert(inventoryTransfer)
      .values({
        id,
        transferNo,
        fromLocation: data.fromBranchId,
        toLocation: data.toBranchId,
        reference: data.reference,
        notes: data.notes,
        userId,
        orgId,
      });
    await tx
      .insert(inventoryTransferItem)
      .values(
        data.items.map((item) => ({
          id: generateId(),
          transferId: id,
          productId: item.productId,
          productName: byId.get(item.productId)!.name,
          quantity: item.quantity,
          orgId,
        }))
      );
  });
  refreshInventory();
  return { id, transferNo };
}

export async function approveInventoryTransfer(transferId: string) {
  const id = z.string().min(1).parse(transferId),
    { authorization, userId, orgId } = await lifecycleContext(
      PermissionEnum.INVENTORY_TRANSFER
    );
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(inventoryTransfer)
      .where(
        and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))
      )
      .limit(1);
    if (!record || record.status !== 'pending')
      throw new Error('Transfer is unavailable or already reviewed');
    assertBranchAccess(authorization, record.fromLocation, record.toLocation);
    const lines = await tx
      .select()
      .from(inventoryTransferItem)
      .where(
        and(
          eq(inventoryTransferItem.transferId, id),
          eq(inventoryTransferItem.orgId, orgId)
        )
      );
    for (const line of lines)
      await reserveInventory(tx, {
        productId: line.productId,
        branchId: record.fromLocation,
        orgId,
        quantity: line.quantity,
      });
    await tx
      .update(inventoryTransfer)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryTransfer.id, id),
          eq(inventoryTransfer.status, 'pending')
        )
      );
  });
  refreshInventory();
}

export async function dispatchInventoryTransfer(
  transferId: string,
  trackingNumber?: string
) {
  const id = z.string().min(1).parse(transferId),
    tracking = z.string().trim().max(100).optional().parse(trackingNumber),
    { authorization, userId, orgId } = await lifecycleContext(
      PermissionEnum.INVENTORY_TRANSFER
    );
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(inventoryTransfer)
      .where(
        and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))
      )
      .limit(1);
    if (!record || record.status !== 'approved')
      throw new Error('Only an approved transfer can be dispatched');
    assertBranchAccess(authorization, record.fromLocation, record.toLocation);
    const lines = await tx
      .select()
      .from(inventoryTransferItem)
      .where(eq(inventoryTransferItem.transferId, id));
    for (const line of lines) {
      await releaseReservation(tx, {
        productId: line.productId,
        branchId: record.fromLocation,
        orgId,
        quantity: line.quantity,
      });
      const movement = await applyInventoryMovement(tx, {
        productId: line.productId,
        productName: line.productName,
        branchId: record.fromLocation,
        quantity: -line.quantity,
        type: 'transfer_dispatch',
        referenceType: 'inventory_transfer',
        referenceId: id,
        reason: record.transferNo,
        userId,
        orgId,
      });
      if (movement.lotAllocations.length) {
        const sourceLots = await tx.select().from(inventoryLot).where(and(eq(inventoryLot.orgId, orgId), inArray(inventoryLot.id, movement.lotAllocations.map((item) => item.lotId))))
        const sourceById = new Map(sourceLots.map((item) => [item.id, item]))
        await tx.insert(inventoryTransferLotAllocation).values(movement.lotAllocations.map((allocation) => {
          const source = sourceById.get(allocation.lotId)
          if (!source) throw new Error('A dispatched batch could not be traced')
          return { id: generateId(), organizationId: orgId, transferId: id, transferItemId: line.id, productId: line.productId, sourceLotId: source.id, lotNumber: source.lotNumber, barcode: source.barcode, manufacturedAt: source.manufacturedAt, bestBeforeAt: source.bestBeforeAt, expiresAt: source.expiresAt, alertAt: source.alertAt, supplierId: source.supplierId, unitCost: source.unitCost, dispatchedQuantity: String(allocation.quantity) }
        }))
      }
      await adjustIncoming(tx, {
        productId: line.productId,
        branchId: record.toLocation,
        orgId,
        quantity: line.quantity,
      });
      await tx
        .update(inventoryTransferItem)
        .set({ dispatchedQuantity: String(line.quantity) })
        .where(eq(inventoryTransferItem.id, line.id));
    }
    await tx
      .update(inventoryTransfer)
      .set({
        status: 'in_transit',
        dispatchedBy: userId,
        dispatchedAt: new Date(),
        trackingNumber: tracking,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryTransfer.id, id),
          eq(inventoryTransfer.status, 'approved')
        )
      );
  });
  await invalidateProductReadCache(orgId);
  refreshInventory();
}

export async function receiveInventoryTransfer(
  input: z.input<typeof receiveTransferSchema>
) {
  const data = receiveTransferSchema.parse(input),
    { authorization, userId, orgId } = await lifecycleContext(
      PermissionEnum.INVENTORY_TRANSFER
    );
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(inventoryTransfer)
      .where(
        and(
          eq(inventoryTransfer.id, data.transferId),
          eq(inventoryTransfer.orgId, orgId)
        )
      )
      .limit(1);
    if (
      !record ||
      !['in_transit', 'partially_received'].includes(record.status)
    )
      throw new Error('Transfer is not ready to receive');
    assertBranchAccess(authorization, record.toLocation);
    if (record.idempotencyKey === data.idempotencyKey) return;
    await tx.execute(
      sql`select ${inventoryTransfer.id} from ${inventoryTransfer} where ${inventoryTransfer.id} = ${record.id} for update`
    );
    const lines = await tx
      .select()
      .from(inventoryTransferItem)
      .where(
        and(
          eq(inventoryTransferItem.transferId, record.id),
          inArray(
            inventoryTransferItem.id,
            data.items.map((item) => item.itemId)
          )
        )
      );
    if (lines.length !== data.items.length)
      throw new Error('A transfer line is invalid');
    const requested = new Map(data.items.map((item) => [item.itemId, item]));
    const [medicineProducts, transferLots] = await Promise.all([
      tx.select({ productId: pharmacyProduct.productId }).from(pharmacyProduct).where(and(eq(pharmacyProduct.organizationId, orgId), inArray(pharmacyProduct.productId, lines.map((line) => line.productId)))),
      tx.select().from(inventoryTransferLotAllocation).where(and(eq(inventoryTransferLotAllocation.organizationId, orgId), eq(inventoryTransferLotAllocation.transferId, record.id), inArray(inventoryTransferLotAllocation.transferItemId, lines.map((line) => line.id)))).orderBy(asc(inventoryTransferLotAllocation.createdAt)),
    ])
    const medicineIds = new Set(medicineProducts.map((item) => item.productId))
    for (const line of lines) {
      const item = requested.get(line.id)!,
        remaining =
          Number(line.dispatchedQuantity) -
          Number(line.receivedQuantity) -
          Number(line.rejectedQuantity);
      if (item.receivedQuantity + item.rejectedQuantity > remaining)
        throw new Error(
          `${line.productName}: only ${remaining} remains in transit`
        );
      await adjustIncoming(tx, {
        productId: line.productId,
        branchId: record.toLocation,
        orgId,
        quantity: -(item.receivedQuantity + item.rejectedQuantity),
      });
      if (item.receivedQuantity)
        await applyInventoryMovement(tx, {
          productId: line.productId,
          productName: line.productName,
          branchId: record.toLocation,
          quantity: item.receivedQuantity,
          type: 'transfer_receipt',
          referenceType: 'inventory_transfer',
          referenceId: record.id,
          reason: record.transferNo,
          userId,
          orgId,
        });
      if (medicineIds.has(line.productId)) {
        const allocations = transferLots.filter((allocation) => allocation.transferItemId === line.id)
        if (!allocations.length || allocations.reduce((sum, allocation) => sum + Number(allocation.dispatchedQuantity), 0) !== Number(line.dispatchedQuantity)) throw new Error(`${line.productName}: batch transfer trace is incomplete`)
        const planned = planTransferLotReceipt(allocations.map((allocation) => ({ id: allocation.id, dispatched: Number(allocation.dispatchedQuantity), received: Number(allocation.receivedQuantity), rejected: Number(allocation.rejectedQuantity) })), item.receivedQuantity, item.rejectedQuantity)
        const planById = new Map(planned.map((entry) => [entry.id, entry]))
        for (const allocation of allocations) {
          const entry = planById.get(allocation.id)
          if (!entry) continue
          const receivedFromLot = entry.received
          const rejectedFromLot = entry.rejected
          if (receivedFromLot > 0) {
            if (!allocation.expiresAt || allocation.expiresAt <= new Date()) throw new Error(`${line.productName}: expired or missing-expiry batches must be rejected, not received`)
            await tx.insert(inventoryLot).values({ id: generateId(), productId: line.productId, branchId: record.toLocation, lotNumber: allocation.lotNumber, barcode: allocation.barcode, quantity: String(receivedFromLot), manufacturedAt: allocation.manufacturedAt, bestBeforeAt: allocation.bestBeforeAt, expiresAt: allocation.expiresAt, alertAt: allocation.alertAt, supplierId: allocation.supplierId, unitCost: allocation.unitCost, status: 'available', orgId }).onConflictDoUpdate({ target: [inventoryLot.productId, inventoryLot.branchId, inventoryLot.lotNumber], set: { quantity: sql`${inventoryLot.quantity} + ${receivedFromLot}`, barcode: allocation.barcode } })
          }
          if (receivedFromLot || rejectedFromLot) await tx.update(inventoryTransferLotAllocation).set({ receivedQuantity: sql`${inventoryTransferLotAllocation.receivedQuantity} + ${receivedFromLot}`, rejectedQuantity: sql`${inventoryTransferLotAllocation.rejectedQuantity} + ${rejectedFromLot}`, updatedAt: new Date() }).where(eq(inventoryTransferLotAllocation.id, allocation.id))
        }
      }
      await tx
        .update(inventoryTransferItem)
        .set({
          receivedQuantity: sql`${inventoryTransferItem.receivedQuantity} + ${item.receivedQuantity}`,
          rejectedQuantity: sql`${inventoryTransferItem.rejectedQuantity} + ${item.rejectedQuantity}`,
        })
        .where(eq(inventoryTransferItem.id, line.id));
    }
    const all = await tx
      .select()
      .from(inventoryTransferItem)
      .where(eq(inventoryTransferItem.transferId, record.id));
    const complete = all.every(
      (line) =>
        Number(line.receivedQuantity) + Number(line.rejectedQuantity) >=
        Number(line.dispatchedQuantity)
    );
    await tx
      .update(inventoryTransfer)
      .set({
        status: complete ? 'received' : 'partially_received',
        receivedBy: userId,
        receivedAt: complete ? new Date() : null,
        idempotencyKey: data.idempotencyKey,
        updatedAt: new Date(),
      })
      .where(eq(inventoryTransfer.id, record.id));
  });
  await invalidateProductReadCache(orgId);
  refreshInventory();
}

export async function cancelInventoryTransfer(transferId: string) {
  const id = z.string().min(1).parse(transferId),
    { authorization, orgId } = await lifecycleContext(
      PermissionEnum.INVENTORY_TRANSFER
    );
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(inventoryTransfer)
      .where(
        and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))
      )
      .limit(1);
    if (!record || !['pending', 'approved'].includes(record.status))
      throw new Error('Only pending or approved transfers can be cancelled');
    assertBranchAccess(authorization, record.fromLocation, record.toLocation);
    if (record.status === 'approved') {
      const lines = await tx
        .select()
        .from(inventoryTransferItem)
        .where(eq(inventoryTransferItem.transferId, id));
      for (const line of lines)
        await releaseReservation(tx, {
          productId: line.productId,
          branchId: record.fromLocation,
          orgId,
          quantity: line.quantity,
        });
    }
    await tx
      .update(inventoryTransfer)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(inventoryTransfer.id, id),
          eq(inventoryTransfer.status, record.status)
        )
      );
  });
  refreshInventory();
}
