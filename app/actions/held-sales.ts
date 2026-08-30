'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auditEvent, customer, posSession, product, productPackage, suspendedSale, user } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { canAccessHeldSale, heldSaleExpired, heldSalePriceChanged } from '@/lib/pos/held-sale-policy'

const OPEN_SHIFT_REQUIRED = 'Open a shift before using held sales'

const heldItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().trim().min(1).max(240),
  quantity: z.number().int().positive().max(100000),
  unitPrice: z.number().nonnegative().max(999999999),
  totalPrice: z.number().nonnegative().max(999999999),
  packageId: z.string().min(1).optional(),
  packageName: z.string().min(1).max(120).optional(),
  baseUnitQuantity: z.number().int().positive().optional(),
})

const heldSaleInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: z.array(heldItemSchema).min(1).max(250),
  customerId: z.string().min(1).optional(),
  discountValue: z.number().nonnegative().max(999999999).default(0),
  discountType: z.enum(['fixed', 'percentage']).default('fixed'),
  note: z.string().trim().max(200).optional(),
})

export type HeldSaleItem = z.infer<typeof heldItemSchema>
export type HeldSaleRecord = {
  id: string
  cart: HeldSaleItem[]
  customerId: string
  discount: number
  discountType: 'fixed' | 'percentage'
  note: string | null
  createdAt: string
  expiresAt: string
  cashierName: string
  terminalId: string | null
}

async function heldSaleContext() {
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requirePermission(PermissionEnum.POS_HOLD)
  if (!authorization.permissions.includes(PermissionEnum.POS_HOLD)) throw new Error('Held-sale permission denied')
  const [session] = await db.select({ id: posSession.id, branchId: posSession.branchId, terminalId: posSession.terminalId })
    .from(posSession)
    .where(and(
      eq(posSession.orgId, authorization.organizationId),
      eq(posSession.openedBy, authorization.userId),
      pos?.terminalId ? eq(posSession.terminalId, pos.terminalId) : undefined,
      pos ? eq(posSession.branchId, pos.branchId) : authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(posSession.branchId, authorization.branchIds) : sql`false`,
      eq(posSession.status, 'open'),
    ))
    .orderBy(desc(posSession.openedAt))
    .limit(1)
  if (!session?.branchId) throw new Error(OPEN_SHIFT_REQUIRED)
  return { authorization, session, terminalId: pos?.terminalId ?? session.terminalId }
}

function asHeldSale(record: typeof suspendedSale.$inferSelect & { cashierName?: string | null }): HeldSaleRecord {
  return {
    id: record.id,
    cart: z.array(heldItemSchema).parse(record.items),
    customerId: record.customerId ?? '',
    discount: Number(record.discountValue),
    discountType: record.discountType === 'percentage' ? 'percentage' : 'fixed',
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    cashierName: record.cashierName ?? 'Cashier',
    terminalId: record.terminalId,
  }
}

async function expireHeldSales(organizationId: string, branchId: string, userId: string) {
  const expired = await db.update(suspendedSale).set({ status: 'EXPIRED', updatedAt: new Date() })
    .where(and(
      eq(suspendedSale.organizationId, organizationId),
      eq(suspendedSale.branchId, branchId),
      eq(suspendedSale.status, 'HELD'),
      lt(suspendedSale.expiresAt, new Date()),
    ))
    .returning({ id: suspendedSale.id })
  if (expired.length) await db.insert(auditEvent).values({
    id: generateId(), organizationId, userId, action: 'held_sale.expired',
    metadata: { branchId, heldSaleIds: expired.map(({ id }) => id), count: expired.length },
  })
}

export async function listHeldSales() {
  try {
    const { authorization, session } = await heldSaleContext()
    const now = new Date()
    const [, rows] = await Promise.all([
      expireHeldSales(authorization.organizationId, session.branchId!, authorization.userId),
      db.select({ record: suspendedSale, cashierName: user.name })
        .from(suspendedSale)
        .leftJoin(user, eq(user.id, suspendedSale.cashierId))
        .where(and(
          eq(suspendedSale.organizationId, authorization.organizationId),
          eq(suspendedSale.branchId, session.branchId!),
          eq(suspendedSale.status, 'HELD'),
          gt(suspendedSale.expiresAt, now),
        ))
        .orderBy(desc(suspendedSale.createdAt))
        .limit(100),
    ])
    return rows.map(({ record, cashierName }) => asHeldSale({ ...record, cashierName }))
  } catch (error) {
    // This read is started automatically when the POS mounts. A terminal that
    // has not opened a shift yet simply has no accessible held-sale queue;
    // returning an empty list avoids surfacing a production Server Component
    // error to the cashier.
    if (error instanceof Error && error.message === OPEN_SHIFT_REQUIRED)
      return []
    throw error
  }
}

export async function holdSaleOnServer(input: z.input<typeof heldSaleInputSchema>) {
  const data = heldSaleInputSchema.parse(input)
  const { authorization, session, terminalId } = await heldSaleContext()
  const productIds = Array.from(new Set(data.items.map(({ productId }) => productId)))
  if (productIds.length !== data.items.length) throw new Error('Combine duplicate products before holding this sale')
  const catalogue = await db.select({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, active: product.isActive })
    .from(product)
    .where(and(eq(product.orgId, authorization.organizationId), inArray(product.id, productIds)))
  const byId = new Map(catalogue.map((item) => [item.id, item]))
  const packageIds = data.items.map(({ packageId }) => packageId).filter((value): value is string => Boolean(value))
  const packageRows = packageIds.length ? await db.select().from(productPackage).where(and(eq(productPackage.organizationId, authorization.organizationId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
  const packageById = new Map(packageRows.map((item) => [item.id, item]))
  const items = data.items.map((line) => {
    const current = byId.get(line.productId)
    if (!current?.active) throw new Error(`${line.productName} is no longer available`)
    const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
    if (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId)) throw new Error(`The selected package for ${current.name} is unavailable`)
    const unitPrice = Number(selectedPackage?.sellingPrice ?? current.sellingPrice)
    return { productId: current.id, productName: selectedPackage ? `${current.name} (${selectedPackage.name})` : current.name, quantity: line.quantity, unitPrice, totalPrice: unitPrice * line.quantity, packageId: selectedPackage?.id, packageName: selectedPackage?.name, baseUnitQuantity: selectedPackage?.baseUnitQuantity ?? 1 }
  })
  if (data.customerId) {
    const [validCustomer] = await db.select({ id: customer.id }).from(customer)
      .where(and(eq(customer.id, data.customerId), eq(customer.orgId, authorization.organizationId))).limit(1)
    if (!validCustomer) throw new Error('Customer is not available in this workspace')
  }
  const existing = await db.select().from(suspendedSale).where(and(
    eq(suspendedSale.organizationId, authorization.organizationId),
    eq(suspendedSale.idempotencyKey, data.idempotencyKey),
  )).limit(1)
  if (existing[0]) {
    if (existing[0].status !== 'HELD') throw new Error('This hold request has already been completed')
    return asHeldSale(existing[0])
  }
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
  const effectiveDiscount = authorization.permissions.includes(PermissionEnum.POS_DISCOUNT) ? data.discountValue : 0
  const [created] = await db.insert(suspendedSale).values({
    id: generateId(), organizationId: authorization.organizationId, branchId: session.branchId!,
    terminalId, sessionId: session.id, cashierId: authorization.userId, customerId: data.customerId ?? null,
    idempotencyKey: data.idempotencyKey, items, discountValue: String(effectiveDiscount),
    discountType: data.discountType, subtotal: String(items.reduce((sum, item) => sum + item.totalPrice, 0)),
    note: data.note || null, expiresAt, createdAt,
  }).onConflictDoNothing({ target: [suspendedSale.organizationId, suspendedSale.idempotencyKey] }).returning()
  if (!created) {
    const [duplicate] = await db.select().from(suspendedSale).where(and(
      eq(suspendedSale.organizationId, authorization.organizationId),
      eq(suspendedSale.idempotencyKey, data.idempotencyKey),
      eq(suspendedSale.status, 'HELD'),
    )).limit(1)
    if (!duplicate) throw new Error('This hold request has already been completed')
    return asHeldSale(duplicate)
  }
  await db.insert(auditEvent).values({
    id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
    action: 'held_sale.created', metadata: { heldSaleId: created.id, branchId: session.branchId, terminalId, sessionId: session.id, itemCount: items.length, expiresAt: expiresAt.toISOString() },
  })
  revalidatePath('/dashboard/pos')
  return asHeldSale(created)
}

export async function resumeHeldSaleFromServer(id: string) {
  const heldSaleId = z.string().min(1).parse(id)
  const { authorization, session, terminalId } = await heldSaleContext()
  const resumed = await db.transaction(async (tx) => {
    const [record] = await tx.select().from(suspendedSale).where(and(
      eq(suspendedSale.id, heldSaleId),
      eq(suspendedSale.organizationId, authorization.organizationId),
      eq(suspendedSale.branchId, session.branchId!),
      eq(suspendedSale.status, 'HELD'),
    )).limit(1).for('update')
    if (!record) throw new Error('This held sale is unavailable or has already been resumed')
    if (!canAccessHeldSale({ organizationId: authorization.organizationId, branchId: session.branchId! }, record)) throw new Error('Held sale access denied')
    if (heldSaleExpired(record.expiresAt)) {
      throw new Error('This held sale has expired')
    }
    const savedItems = z.array(heldItemSchema).parse(record.items)
    const productIds = savedItems.map(({ productId }) => productId)
    const currentProducts = await tx.select({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, active: product.isActive })
      .from(product).where(and(eq(product.orgId, authorization.organizationId), inArray(product.id, productIds)))
    const currentById = new Map(currentProducts.map((item) => [item.id, item]))
    const packageIds = savedItems.map(({ packageId }) => packageId).filter((value): value is string => Boolean(value))
    const currentPackages = packageIds.length ? await tx.select().from(productPackage).where(and(eq(productPackage.organizationId, authorization.organizationId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
    const packageById = new Map(currentPackages.map((item) => [item.id, item]))
    let priceChanged = false
    const currentItems = savedItems.map((item) => {
      const current = currentById.get(item.productId)
      if (!current?.active) throw new Error(`${item.productName} is no longer available`)
      const selectedPackage = item.packageId ? packageById.get(item.packageId) : null
      if (item.packageId && (!selectedPackage || selectedPackage.productId !== item.productId)) throw new Error(`The selected package for ${current.name} is unavailable`)
      const unitPrice = Number(selectedPackage?.sellingPrice ?? current.sellingPrice)
      if (heldSalePriceChanged(item.unitPrice, unitPrice)) priceChanged = true
      return { ...item, productName: selectedPackage ? `${current.name} (${selectedPackage.name})` : current.name, unitPrice, totalPrice: unitPrice * item.quantity, packageName: selectedPackage?.name, baseUnitQuantity: selectedPackage?.baseUnitQuantity ?? 1 }
    })
    const [updated] = await tx.update(suspendedSale).set({
      status: 'RESUMED', resumedBy: authorization.userId, resumedTerminalId: terminalId,
      resumedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(suspendedSale.id, record.id), eq(suspendedSale.status, 'HELD'))).returning()
    if (!updated) throw new Error('This held sale was resumed on another register')
    await tx.insert(auditEvent).values({
      id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: record.terminalId && terminalId && record.terminalId !== terminalId ? 'held_sale.transferred' : 'held_sale.resumed',
      metadata: { heldSaleId: record.id, branchId: session.branchId, fromTerminalId: record.terminalId, toTerminalId: terminalId, originalCashierId: record.cashierId, priceChanged },
    })
    return { record: { ...record, items: currentItems }, priceChanged }
  })
  revalidatePath('/dashboard/pos')
  return { heldSale: asHeldSale(resumed.record), priceChanged: resumed.priceChanged }
}

export async function discardHeldSale(id: string) {
  const heldSaleId = z.string().min(1).parse(id)
  const { authorization, session } = await heldSaleContext()
  const [deleted] = await db.update(suspendedSale).set({
    status: 'DELETED', deletedBy: authorization.userId, deletedAt: new Date(), updatedAt: new Date(),
  }).where(and(
    eq(suspendedSale.id, heldSaleId),
    eq(suspendedSale.organizationId, authorization.organizationId),
    eq(suspendedSale.branchId, session.branchId!),
    eq(suspendedSale.status, 'HELD'),
  )).returning({ id: suspendedSale.id })
  if (!deleted) throw new Error('This held sale is unavailable or already changed')
  await db.insert(auditEvent).values({
    id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
    action: 'held_sale.deleted', metadata: { heldSaleId, branchId: session.branchId },
  })
  revalidatePath('/dashboard/pos')
  return { success: true }
}
