'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stockAdjustment, stockAdjustmentItem, product, stockMovement, auditEvent } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateId } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const workspace = await WorkspaceService.getCurrentWorkspace(userId, 'pos')
  if (!workspace) throw new Error('Workspace not found')
  return workspace.organizationId
}

interface AdjustmentItem {
  productId: string
  productName: string
  quantityBefore: number
  quantityAfter: number
}

export async function createStockAdjustment(data: {
  type: 'stocktake' | 'loss' | 'damage' | 'correction'
  items: AdjustmentItem[]
  notes?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  const adjustmentId = generateId()
  const adjustmentNo = `ADJ-${Date.now().toString().slice(-6)}`

  await db.transaction(async (tx) => {
    // Create adjustment record
    await tx.insert(stockAdjustment).values({
      id: adjustmentId,
      adjustmentNo,
      type: data.type,
      status: 'pending',
      notes: data.notes,
      userId,
      orgId,
    })

    // Create adjustment items
    for (const item of data.items) {
      const variance = item.quantityAfter - item.quantityBefore

      await tx.insert(stockAdjustmentItem).values({
        id: generateId(),
        adjustmentId,
        productId: item.productId,
        productName: item.productName,
        quantityBefore: item.quantityBefore,
        quantityAfter: item.quantityAfter,
        variance,
        orgId,
      })
    }

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'stock_adjustment_created',
      metadata: {
        adjustmentId,
        adjustmentNo,
        type: data.type,
        itemsCount: data.items.length,
      },
    })
  })

  return { adjustmentId, adjustmentNo, status: 'pending' }
}

export async function approveStockAdjustment(adjustmentId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  const [adjustment] = await db.select().from(stockAdjustment)
    .where(and(eq(stockAdjustment.id, adjustmentId), eq(stockAdjustment.orgId, orgId)))
    .limit(1)

  if (!adjustment) throw new Error('Adjustment not found')

  await db.transaction(async (tx) => {
    // Get all items for this adjustment
    const items = await tx.select().from(stockAdjustmentItem)
      .where(eq(stockAdjustmentItem.adjustmentId, adjustmentId))

    // Apply adjustments and create stock movements
    for (const item of items) {
      // Update product stock
      const [productRecord] = await tx.select({ stock: product.stock }).from(product)
        .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))
        .limit(1)

      if (!productRecord) throw new Error(`Product ${item.productName} not found`)

      await tx.update(product)
        .set({ stock: item.quantityAfter })
        .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))

      // Record stock movement
      await tx.insert(stockMovement).values({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'adjustment',
        quantity: item.variance,
        stockBefore: item.quantityBefore,
        stockAfter: item.quantityAfter,
        referenceType: 'adjustment',
        referenceId: adjustmentId,
        reason: `Stock ${adjustment.type} adjustment approved`,
        userId,
        orgId,
      })
    }

    // Update adjustment status
    await tx.update(stockAdjustment)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      })
      .where(eq(stockAdjustment.id, adjustmentId))

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'stock_adjustment_approved',
      metadata: {
        adjustmentId,
        itemsCount: items.length,
      },
    })
  })

  return { status: 'approved' }
}

export async function rejectStockAdjustment(adjustmentId: string, reason: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  await db.update(stockAdjustment)
    .set({
      status: 'rejected',
      notes: `Rejected: ${reason}`,
      approvedBy: userId,
      approvedAt: new Date(),
    })
    .where(and(eq(stockAdjustment.id, adjustmentId), eq(stockAdjustment.orgId, orgId)))

  // Create audit event
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'stock_adjustment_rejected',
    metadata: {
      adjustmentId,
      reason,
    },
  })

  return { status: 'rejected' }
}
