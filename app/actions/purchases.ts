'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { product, purchase, purchaseItem, stockMovement, supplier } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { generateId } from '@/lib/utils'

async function context() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization available')
  return { userId: session.user.id, orgId: organization.id }
}

const supplierSchema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal('')), taxId: z.string().trim().max(50).optional() })
const receiptSchema = z.object({ supplierId: z.string().min(1), productId: z.string().min(1), quantity: z.coerce.number().int().positive().max(1_000_000), unitCost: z.coerce.number().nonnegative().max(999_999_999), reference: z.string().trim().max(80).optional(), paymentStatus: z.enum(['unpaid', 'partial', 'paid']), notes: z.string().trim().max(500).optional() })

export async function getProcurementData() {
  const { orgId } = await context()
  const [suppliers, purchases, products, movements] = await Promise.all([
    db.select().from(supplier).where(eq(supplier.orgId, orgId)).orderBy(desc(supplier.createdAt)),
    db.select().from(purchase).where(eq(purchase.orgId, orgId)).orderBy(desc(purchase.createdAt)).limit(100),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true))).orderBy(product.name),
    db.select().from(stockMovement).where(eq(stockMovement.orgId, orgId)).orderBy(desc(stockMovement.createdAt)).limit(20),
  ])
  return { suppliers, purchases, products, movements }
}

export async function createSupplier(input: z.input<typeof supplierSchema>) {
  const data = supplierSchema.parse(input)
  const { userId, orgId } = await context()
  await db.insert(supplier).values({ id: generateId(), ...data, email: data.email || null, userId, orgId })
  revalidatePath('/dashboard/purchases')
}

export async function receivePurchase(input: z.input<typeof receiptSchema>) {
  const data = receiptSchema.parse(input)
  const { userId, orgId } = await context()
  await db.transaction(async (tx) => {
    const [[vendor], [item]] = await Promise.all([
      tx.select().from(supplier).where(and(eq(supplier.id, data.supplierId), eq(supplier.orgId, orgId))).limit(1),
      tx.select().from(product).where(and(eq(product.id, data.productId), eq(product.orgId, orgId))).limit(1),
    ])
    if (!vendor || !item) throw new Error('Supplier or product was not found')
    const purchaseId = generateId()
    const total = data.quantity * data.unitCost
    const purchaseNo = `PO-${Date.now().toString().slice(-8)}`
    await tx.insert(purchase).values({ id: purchaseId, purchaseNo, supplierId: vendor.id, supplierName: vendor.name, reference: data.reference || null, subtotal: String(total), total: String(total), paymentStatus: data.paymentStatus, status: 'received', notes: data.notes || null, userId, orgId })
    await tx.insert(purchaseItem).values({ id: generateId(), purchaseId, productId: item.id, productName: item.name, quantity: data.quantity, unitCost: String(data.unitCost), totalCost: String(total), orgId })
    await tx.update(product).set({ stock: sql`${product.stock} + ${data.quantity}`, buyingPrice: String(data.unitCost), updatedAt: new Date() }).where(and(eq(product.id, item.id), eq(product.orgId, orgId)))
    await tx.insert(stockMovement).values({ id: generateId(), productId: item.id, productName: item.name, type: 'purchase_receipt', quantity: data.quantity, stockBefore: item.stock, stockAfter: item.stock + data.quantity, referenceType: 'purchase', referenceId: purchaseId, reason: data.reference || purchaseNo, userId, orgId })
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/purchases')
  revalidatePath('/dashboard/reports')
}
