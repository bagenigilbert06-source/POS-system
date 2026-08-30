'use server'

import { db } from '@/lib/db'
import { businessSettings, organization, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { OrganizationService } from '@/lib/services/organization-service'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

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
  receiptLayout?: 'detailed' | 'thermal'
  receiptTemplate?: 'classic' | 'logo' | 'cafe'
  receiptLogoUrl?: string
  receiptShowPhone?: boolean
  receiptShowAddress?: boolean
  receiptShowCashier?: boolean
  receiptShowCustomer?: boolean
  receiptShowPayment?: boolean
  receiptShowQrCode?: boolean
  receiptShowItemSku?: boolean
  receiptShowShipping?: boolean
  receiptShowCoupon?: boolean
  receiptShowBonus?: boolean
  defaultPaymentMethod?: string
  paymentMethods?: string[]
  taxEnabled?: boolean
  pricesIncludeTax?: boolean
  showTaxOnReceipt?: boolean
  financialYearStart?: string
  receiptPrintingMode?: 'direct' | 'browser'
  receiptPrinterName?: string
  receiptPaperWidth?: 58 | 80
  receiptAutoPrint?: boolean
  receiptPrintCustomerCopy?: boolean
  receiptPrintCopies?: number
  receiptCashDrawerPulse?: boolean
}) {
  await requirePermission(PermissionEnum.SETTINGS_EDIT)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  const paymentMethods = data.paymentMethods
    ? Array.from(new Set(data.paymentMethods.filter((method) => ['cash', 'card', 'mpesa', 'airtel_money', 'bank_transfer', 'credit'].includes(method))))
    : undefined
  if (paymentMethods && paymentMethods.length === 0) throw new Error('Enable at least one payment method')
  if (data.defaultPaymentMethod && paymentMethods && !paymentMethods.includes(data.defaultPaymentMethod)) throw new Error('The default payment method must be enabled')
  if (data.financialYearStart && !/^\d{2}-\d{2}$/.test(data.financialYearStart)) throw new Error('Invalid financial year start')
  if (data.receiptPrintCopies !== undefined && (!Number.isInteger(data.receiptPrintCopies) || data.receiptPrintCopies < 1 || data.receiptPrintCopies > 5)) throw new Error('Receipt copies must be between 1 and 5')

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
        ...(data.receiptLayout && { receiptLayout: data.receiptLayout }),
        ...(data.receiptTemplate && { receiptTemplate: data.receiptTemplate }),
        ...(data.receiptLogoUrl !== undefined && { receiptLogoUrl: data.receiptLogoUrl || null }),
        ...(data.receiptShowPhone !== undefined && { receiptShowPhone: data.receiptShowPhone }),
        ...(data.receiptShowAddress !== undefined && { receiptShowAddress: data.receiptShowAddress }),
        ...(data.receiptShowCashier !== undefined && { receiptShowCashier: data.receiptShowCashier }),
        ...(data.receiptShowCustomer !== undefined && { receiptShowCustomer: data.receiptShowCustomer }),
        ...(data.receiptShowPayment !== undefined && { receiptShowPayment: data.receiptShowPayment }),
        ...(data.receiptShowQrCode !== undefined && { receiptShowQrCode: data.receiptShowQrCode }),
        ...(data.receiptShowItemSku !== undefined && { receiptShowItemSku: data.receiptShowItemSku }),
        ...(data.receiptShowShipping !== undefined && { receiptShowShipping: data.receiptShowShipping }),
        ...(data.receiptShowCoupon !== undefined && { receiptShowCoupon: data.receiptShowCoupon }),
        ...(data.receiptShowBonus !== undefined && { receiptShowBonus: data.receiptShowBonus }),
        ...(data.defaultPaymentMethod && { defaultPaymentMethod: data.defaultPaymentMethod }),
        ...(paymentMethods && { paymentMethods }),
        ...(data.taxEnabled !== undefined && { taxEnabled: data.taxEnabled }),
        ...(data.pricesIncludeTax !== undefined && { pricesIncludeTax: data.pricesIncludeTax }),
        ...(data.showTaxOnReceipt !== undefined && { showTaxOnReceipt: data.showTaxOnReceipt }),
        ...(data.financialYearStart && { financialYearStart: data.financialYearStart }),
        ...(data.receiptPrintingMode && { receiptPrintingMode: data.receiptPrintingMode }),
        ...(data.receiptPrinterName !== undefined && { receiptPrinterName: data.receiptPrinterName.trim() || null }),
        ...(data.receiptPaperWidth !== undefined && { receiptPaperWidth: data.receiptPaperWidth }),
        ...(data.receiptAutoPrint !== undefined && { receiptAutoPrint: data.receiptAutoPrint }),
        ...(data.receiptPrintCustomerCopy !== undefined && { receiptPrintCustomerCopy: data.receiptPrintCustomerCopy }),
        ...(data.receiptPrintCopies !== undefined && { receiptPrintCopies: data.receiptPrintCopies }),
        ...(data.receiptCashDrawerPulse !== undefined && { receiptCashDrawerPulse: data.receiptCashDrawerPulse }),
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
  await requirePermission(PermissionEnum.SETTINGS_EDIT)
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

export async function updateAccountName(name: string) {
  const userId = await getUserId()
  const nextName = name.trim()
  if (nextName.length < 2 || nextName.length > 120) throw new Error('Enter a name between 2 and 120 characters')

  await db.update(user).set({ name: nextName, updatedAt: new Date() }).where(eq(user.id, userId))
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
