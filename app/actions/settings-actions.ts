'use server'

import { db } from '@/lib/db'
import { businessSettings, organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUserId, getOrgId } from '@/lib/auth'

export async function updateBusinessSettings(data: {
  displayName?: string
  address?: string
  city?: string
  region?: string
  taxRate?: number
  taxName?: string
  receiptBusinessName?: string
  receiptPhone?: string
  receiptAddress?: string
  receiptFooter?: string
  defaultPaymentMethod?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const updated = await db
      .update(businessSettings)
      .set({
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.region && { region: data.region }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate.toString() }),
        ...(data.taxName && { taxName: data.taxName }),
        ...(data.receiptBusinessName && { receiptBusinessName: data.receiptBusinessName }),
        ...(data.receiptPhone && { receiptPhone: data.receiptPhone }),
        ...(data.receiptAddress && { receiptAddress: data.receiptAddress }),
        ...(data.receiptFooter && { receiptFooter: data.receiptFooter }),
        ...(data.defaultPaymentMethod && { defaultPaymentMethod: data.defaultPaymentMethod }),
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.organizationId, orgId))
      .returning()

    return { success: true, settings: updated[0] }
  } catch (error) {
    console.error('[v0] Error updating business settings:', error)
    throw new Error('Failed to update business settings')
  }
}

export async function updateOrganizationSettings(data: {
  name?: string
  taxRate?: number
  currency?: string
  timezone?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const updated = await db
      .update(organization)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate.toString() }),
        ...(data.currency && { currency: data.currency }),
        ...(data.timezone && { timezone: data.timezone }),
        updatedAt: new Date(),
      })
      .where(eq(organization.id, orgId))
      .returning()

    return { success: true, organization: updated[0] }
  } catch (error) {
    console.error('[v0] Error updating organization settings:', error)
    throw new Error('Failed to update organization settings')
  }
}
