'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sale, creditSale, creditPayment, customerCreditLimit, auditEvent } from '@/lib/db/schema'
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

export async function createCreditSale(data: {
  saleId: string
  customerId: string
  amount: number
  dueDate?: Date
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  // Check customer credit limit
  const [creditLimit] = await db.select().from(customerCreditLimit)
    .where(and(eq(customerCreditLimit.customerId, data.customerId), eq(customerCreditLimit.orgId, orgId)))
    .limit(1)

  if (creditLimit && creditLimit.currentBalance + data.amount > parseFloat(creditLimit.creditLimit)) {
    throw new Error('Credit limit exceeded for this customer')
  }

  const creditSaleId = generateId()

  await db.transaction(async (tx) => {
    // Create credit sale record
    await tx.insert(creditSale).values({
      id: creditSaleId,
      saleId: data.saleId,
      customerId: data.customerId,
      amount: String(data.amount),
      amountPaid: '0',
      dueDate: data.dueDate,
      status: 'unpaid',
      userId,
      orgId,
    })

    // Update customer credit balance
    if (creditLimit) {
      const newBalance = parseFloat(creditLimit.currentBalance) + data.amount
      await tx.update(customerCreditLimit)
        .set({ currentBalance: String(newBalance) })
        .where(eq(customerCreditLimit.id, creditLimit.id))
    }

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'credit_sale_created',
      metadata: {
        creditSaleId,
        saleId: data.saleId,
        customerId: data.customerId,
        amount: data.amount,
        dueDate: data.dueDate?.toISOString(),
      },
    })
  })

  return { creditSaleId, status: 'success' }
}

export async function recordCreditPayment(data: {
  creditSaleId: string
  amount: number
  method: 'cash' | 'mpesa' | 'check'
  reference?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  const [creditSaleRecord] = await db.select().from(creditSale)
    .where(and(eq(creditSale.id, data.creditSaleId), eq(creditSale.orgId, orgId)))
    .limit(1)

  if (!creditSaleRecord) throw new Error('Credit sale not found')

  const newAmountPaid = parseFloat(creditSaleRecord.amountPaid) + data.amount
  const isFullyPaid = newAmountPaid >= parseFloat(creditSaleRecord.amount)

  const paymentId = generateId()

  await db.transaction(async (tx) => {
    // Record payment
    await tx.insert(creditPayment).values({
      id: paymentId,
      creditSaleId: data.creditSaleId,
      amount: String(data.amount),
      method: data.method,
      reference: data.reference,
      userId,
      orgId,
    })

    // Update credit sale status
    await tx.update(creditSale)
      .set({
        amountPaid: String(newAmountPaid),
        status: isFullyPaid ? 'paid' : 'partially_paid',
      })
      .where(eq(creditSale.id, data.creditSaleId))

    // Update customer credit balance
    const [creditRecord] = await tx.select().from(creditSale)
      .where(eq(creditSale.id, data.creditSaleId))
      .limit(1)

    if (creditRecord) {
      const [customerCredit] = await tx.select().from(customerCreditLimit)
        .where(and(eq(customerCreditLimit.customerId, creditRecord.customerId), eq(customerCreditLimit.orgId, orgId)))
        .limit(1)

      if (customerCredit) {
        const newBalance = Math.max(0, parseFloat(customerCredit.currentBalance) - data.amount)
        await tx.update(customerCreditLimit)
          .set({ currentBalance: String(newBalance) })
          .where(eq(customerCreditLimit.id, customerCredit.id))
      }
    }

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'credit_payment_recorded',
      metadata: {
        paymentId,
        creditSaleId: data.creditSaleId,
        amount: data.amount,
        method: data.method,
        fullyPaid: isFullyPaid,
      },
    })
  })

  return { paymentId, status: 'success', fullyPaid: isFullyPaid }
}

export async function setCustomerCreditLimit(data: {
  customerId: string
  creditLimit: number
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId, 'pos')

  const [existing] = await db.select().from(customerCreditLimit)
    .where(and(eq(customerCreditLimit.customerId, data.customerId), eq(customerCreditLimit.orgId, orgId)))
    .limit(1)

  if (existing) {
    await db.update(customerCreditLimit)
      .set({
        creditLimit: String(data.creditLimit),
        approvedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(customerCreditLimit.id, existing.id))
  } else {
    await db.insert(customerCreditLimit).values({
      id: generateId(),
      customerId: data.customerId,
      creditLimit: String(data.creditLimit),
      currentBalance: '0',
      approvedBy: userId,
      orgId,
    })
  }

  return { status: 'success' }
}
