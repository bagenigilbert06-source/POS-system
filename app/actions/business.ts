'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const organization = await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  return organization.id
}

export async function getBusinessSettings() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  
  const [settings] = await db.select().from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  
  // Return settings or safe defaults
  return {
    displayName: settings?.displayName || 'Business',
    receiptBusinessName: settings?.receiptBusinessName || settings?.displayName || 'Business',
    receiptPhone: settings?.receiptPhone || '',
    receiptAddress: settings?.receiptAddress || '',
    receiptFooter: settings?.receiptFooter || 'Thank you for your purchase',
    taxEnabled: settings?.taxEnabled || false,
    taxRate: parseFloat(settings?.taxRate?.toString() || '0'),
    taxName: settings?.taxName || 'VAT',
    pricesIncludeTax: settings?.pricesIncludeTax || false,
    paymentMethods: (Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : ['cash']) || ['cash'],
    showTaxOnReceipt: settings?.showTaxOnReceipt || false,
  }
}
