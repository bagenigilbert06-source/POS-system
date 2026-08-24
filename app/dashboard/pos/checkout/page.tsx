import type { Metadata } from 'next'
import { POSTerminal } from '@/components/pos/pos-terminal'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import Link from 'next/link'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'
import { getCurrentSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPosPageData } from '@/lib/services/pos-page-service'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'

export const metadata: Metadata = { title: 'Checkout' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function POSCheckoutPage() {
  const posAuthorization = await getPosAuthorizationContext()
  if (!(await getCurrentSession())?.user && !posAuthorization) redirect('/sign-in')
  const { config } = await requireWorkspaceModule('pos')
  const authorization = posAuthorization ?? await getAuthorizationContext()
  const operator = authorization
  const data = await getPosPageData(
    operator,
    config.enabledModules.includes('customers'),
    isPharmacyBusiness(config.businessType, config.businessCategory)
  )
  if (!data.activeBranch) throw new Error('No authorized POS branch is available')

  return <div className="mx-auto max-w-[1480px] space-y-5">
    <DashboardPageHeading theme="adaptive" icon={CreditCard} title="Checkout" description="Review the basket, choose a payment method, and complete the sale securely." action={<Link href="/dashboard/pos" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#344054] shadow-sm transition-colors hover:bg-[#f9fafb] dark:border-white/10 dark:bg-[#111113] dark:text-[#f5f5f7] dark:hover:bg-[#1d1d1f]"><ArrowLeft className="h-4 w-4" />Back to POS</Link>} />
    <POSTerminal organizationId={operator.organizationId} products={data.products} categories={data.categories} customers={data.customers} settings={data.settings} requiresAgeVerification={config.businessCategory === 'liquor_shop'} pharmacyMode={isPharmacyBusiness(config.businessType, config.businessCategory)} hasActiveShift={Boolean(data.cashierWorkspace.session)} canDiscount={operator.permissions.includes(PermissionEnum.POS_DISCOUNT)} canRefund={operator.permissions.includes(PermissionEnum.SALE_REFUND)} canHold={operator.permissions.includes(PermissionEnum.POS_HOLD)} canApproveRestricted={operator.permissions.includes(PermissionEnum.PHARMACY_RESTRICTED_APPROVE)} offlineContext={{ sessionId: data.cashierWorkspace.session?.id ?? null, branchId: data.activeBranch.id, terminalId: data.cashierWorkspace.session?.terminalId ?? null }} startCheckout checkoutOnly />
  </div>
}
