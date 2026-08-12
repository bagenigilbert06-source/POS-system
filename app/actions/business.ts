'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

async function getUserId() {
  const pos = await getPosAuthorizationContext()
  if (pos) return pos.userId
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const pos = await getPosAuthorizationContext()
  const organization = pos
    ? await OrganizationService.getOrganization(pos.organizationId, userId)
    : await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  return organization.id
}

export async function getBusinessSettings() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  
  const [settings] = await db.select().from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  
  const configuredPaymentMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []

  // Return settings or safe defaults
  return {
    displayName: settings?.displayName || 'Business',
    receiptBusinessName: settings?.receiptBusinessName || settings?.displayName || 'Business',
    receiptPhone: settings?.receiptPhone || '',
    receiptAddress: settings?.receiptAddress || '',
    receiptFooter: settings?.receiptFooter || 'Thank you for your purchase',
    receiptLayout: settings?.receiptLayout === 'detailed' ? 'detailed' as const : 'thermal' as const,
    receiptTemplate: settings?.receiptTemplate === 'logo' || settings?.receiptTemplate === 'cafe' ? settings.receiptTemplate as 'logo' | 'cafe' : 'classic' as const,
    receiptLogoUrl: settings?.receiptLogoUrl || '',
    taxEnabled: settings?.taxEnabled || false,
    taxRate: parseFloat(settings?.taxRate?.toString() || '0'),
    taxName: settings?.taxName || 'VAT',
    pricesIncludeTax: settings?.pricesIncludeTax || false,
    paymentMethods: configuredPaymentMethods.length > 0 ? configuredPaymentMethods : ['cash'],
    showTaxOnReceipt: settings?.showTaxOnReceipt || false,
    receiptShowPhone: settings?.receiptShowPhone ?? true,
    receiptShowAddress: settings?.receiptShowAddress ?? true,
    receiptShowCashier: settings?.receiptShowCashier ?? true,
    receiptShowCustomer: settings?.receiptShowCustomer ?? true,
    receiptShowPayment: settings?.receiptShowPayment ?? true,
    receiptShowQrCode: settings?.receiptShowQrCode ?? false,
    receiptShowItemSku: settings?.receiptShowItemSku ?? false,
  }
}
