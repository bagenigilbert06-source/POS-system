'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/authorization';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import { db } from '@/lib/db';
import { auditEvent, branch, product } from '@/lib/db/schema';
import {
  addCostLayer,
  applyInventoryMovement,
} from '@/lib/inventory/inventory-service';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';

const receivingUnits = ['base', 'case', 'pack', 'crate', 'carton'] as const;

const receiveStockSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  unit: z.enum(receivingUnits),
  unitCost: z.coerce.number().nonnegative().max(1_000_000_000).optional(),
  source: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  receivedAt: z.coerce.date(),
});

export async function receiveStock(input: z.input<typeof receiveStockSchema>) {
  const data = receiveStockSchema.parse(input);
  const authorization = await requirePermission(
    PermissionEnum.INVENTORY_RECEIVE
  );
  const { organizationId: orgId, userId } = authorization;
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  ) {
    throw new Error('You do not have access to this inventory location');
  }
  if (data.receivedAt.getTime() > Date.now() + 5 * 60_000) {
    throw new Error('Date received cannot be in the future');
  }

  const [[item], [location]] = await Promise.all([
    db
      .select()
      .from(product)
      .where(
        and(
          eq(product.id, data.productId),
          eq(product.orgId, orgId),
          eq(product.isActive, true)
        )
      )
      .limit(1),
    db
      .select({ id: branch.id })
      .from(branch)
      .where(
        and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))
      )
      .limit(1),
  ]);
  if (!item) throw new Error('Product not found');
  if (!location) throw new Error('Inventory location not found');
  if (item.trackingMode !== 'none')
    throw new Error('Receive batch- or serial-tracked products through a confirmed purchase order so traceability details are recorded');

  const conversion = data.unit === 'base' ? 1 : Number(item.unitsPerPack ?? 0);
  if (data.unit !== 'base' && conversion <= 0) {
    throw new Error(
      `Set the ${item.name} case/pack size before receiving by ${data.unit}`
    );
  }
  const baseQuantity = data.quantity * conversion;
  if (!Number.isSafeInteger(baseQuantity) || baseQuantity > 10_000_000) {
    throw new Error('Calculated base quantity is too large');
  }
  const baseUnitCost =
    data.unitCost === undefined ? undefined : data.unitCost / conversion;
  const receiptId = generateId();
  const receiptNo = data.reference || `RCV-${Date.now().toString().slice(-8)}`;
  const details = [
    data.source ? `Source: ${data.source}` : null,
    data.note || null,
    `Received: ${data.receivedAt.toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const movement = await db.transaction(async (tx) => {
    const result = await applyInventoryMovement(tx, {
      productId: item.id,
      productName: item.name,
      branchId: location.id,
      quantity: baseQuantity,
      type: 'stock_received',
      referenceType: 'stock_receipt',
      referenceId: receiptNo,
      reason: details,
      userId,
      orgId,
      unitCost: baseUnitCost,
    });
    if (baseUnitCost !== undefined) {
      await addCostLayer(tx, {
        productId: item.id,
        branchId: location.id,
        sourceType: 'stock_receipt',
        sourceId: receiptId,
        quantity: baseQuantity,
        unitCost: baseUnitCost,
        orgId,
      });
      await tx
        .update(product)
        .set({ buyingPrice: String(baseUnitCost), updatedAt: new Date() })
        .where(and(eq(product.id, item.id), eq(product.orgId, orgId)));
    }
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'inventory.stock_received',
      metadata: {
        receiptId,
        receiptNo,
        productId: item.id,
        branchId: location.id,
        enteredQuantity: data.quantity,
        enteredUnit: data.unit === 'base' ? item.unit : data.unit,
        conversion,
        baseQuantity,
        baseUnit: item.unit,
        source: data.source || null,
        receivedAt: data.receivedAt.toISOString(),
      },
    });
    return result;
  });

  await invalidateProductReadCache(orgId);
  [
    '/dashboard',
    '/dashboard/inventory',
    '/dashboard/products',
    '/dashboard/reports',
  ].forEach((path) => revalidatePath(path));
  return { receiptNo, baseQuantity, unit: item.unit, ...movement };
}
