'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sale, saleItem, salesReturn, salesReturnItem, product, stockMovement, auditEvent } from '@/lib/db/schema'
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

interface RefundItem {
  saleItemId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export async function processRefund(data: {
  saleId: string
  receiptNo: string
  items: RefundItem[]
  totalAmount: number
  refundMethod: 'cash' | 'mpesa' | 'credit'
  refundReference?: string
  reason: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  // Get the original sale
  const [originalSale] = await db.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1)
  if (!originalSale) throw new Error('Sale not found')

  const returnId = generateId()
  const returnNo = `RET-${Date.now().toString().slice(-6)}`

  await db.transaction(async (tx) => {
    // Create sales return record
    await tx.insert(salesReturn).values({
      id: returnId,
      returnNo,
      saleId: data.saleId,
      receiptNo: data.receiptNo,
      amount: String(data.totalAmount),
      refundMethod: data.refundMethod,
      reason: data.reason,
      status: 'completed',
      userId,
      orgId,
    })

    // Process each returned item
    for (const item of data.items) {
      // Add sales return item record
      await tx.insert(salesReturnItem).values({
        id: generateId(),
        returnId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        total: String(item.quantity * item.unitPrice),
        disposition: 'restock',
        orgId,
      })

      // Restore stock
      const [productRecord] = await tx.select({ stock: product.stock }).from(product).where(and(eq(product.id, item.productId), eq(product.orgId, orgId))).limit(1)
      if (!productRecord) throw new Error(`Product ${item.productName} not found`)

      await tx.update(product).set({ stock: productRecord.stock + item.quantity }).where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))

      // Record stock movement
      await tx.insert(stockMovement).values({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'return',
        quantity: item.quantity,
        stockBefore: productRecord.stock,
        stockAfter: productRecord.stock + item.quantity,
        referenceType: 'refund',
        referenceId: returnId,
        reason: `Refund: ${data.reason}`,
        userId,
        orgId,
      })
    }

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'refund_processed',
      metadata: {
        returnId,
        returnNo,
        saleId: data.saleId,
        receiptNo: data.receiptNo,
        amount: data.totalAmount,
        method: data.refundMethod,
        itemsCount: data.items.length,
        reason: data.reason,
      },
    })
  })

  return { returnId, returnNo, status: 'success' }
}

export async function getRefundHistory(saleId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  const returns = await db.select().from(salesReturn).where(and(eq(salesReturn.saleId, saleId), eq(salesReturn.orgId, orgId)))

  return returns
}
