'use server'

import { db } from '@/lib/db'
import { invoice, invoiceItem } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const org = await OrganizationService.getPrimaryOrganization(userId)
  if (!org) throw new Error('Organization not found')
  return org.id
}

export async function createInvoice(data: {
  invoiceNo: string
  customerId?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
  notes?: string
  dueDate?: Date
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = subtotal * 0.16 // 16% tax
    const total = subtotal + taxAmount

    const newInvoice = await db
      .insert(invoice)
      .values({
        id: nanoid(),
        invoiceNo: data.invoiceNo,
        customerId: data.customerId,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        dueDate: data.dueDate,
        notes: data.notes,
        status: 'draft',
        userId,
        orgId,
      })
      .returning()

    // Add invoice items
    if (data.items.length > 0) {
      await db.insert(invoiceItem).values(
        data.items.map((item) => ({
          id: nanoid(),
          invoiceId: newInvoice[0].id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          total: (item.quantity * item.unitPrice).toString(),
          orgId,
        }))
      )
    }

    return { success: true, invoice: newInvoice[0] }
  } catch (error) {
    console.error('[v0] Error creating invoice:', error)
    throw new Error('Failed to create invoice')
  }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const updated = await db
      .update(invoice)
      .set({ status })
      .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)))
      .returning()

    return { success: true, invoice: updated[0] }
  } catch (error) {
    console.error('[v0] Error updating invoice status:', error)
    throw new Error('Failed to update invoice status')
  }
}

export async function deleteInvoice(invoiceId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    await db
      .delete(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)))

    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting invoice:', error)
    throw new Error('Failed to delete invoice')
  }
}

export async function getInvoiceWithItems(invoiceId: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const inv = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)))

    if (!inv[0]) throw new Error('Invoice not found')

    const items = await db
      .select()
      .from(invoiceItem)
      .where(eq(invoiceItem.invoiceId, invoiceId))

    return { invoice: inv[0], items }
  } catch (error) {
    console.error('[v0] Error fetching invoice:', error)
    throw new Error('Failed to fetch invoice')
  }
}
