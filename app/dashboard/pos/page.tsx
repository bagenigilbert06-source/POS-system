import { POSTerminal } from '@/components/pos/pos-terminal'
import type { Metadata } from 'next'
import { ReceiptText } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { CashierShiftStrip } from '@/components/pos/cashier-shift-strip'
import { PosSecurity } from '@/components/pos/pos-security'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPosPageData } from '@/lib/services/pos-page-service'

export const metadata: Metadata = { title: 'POS Terminal' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function POSPage() {
  const posAuthorization = await getPosAuthorizationContext()
  const pageAuthorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!pageAuthorization.permissions.some((permission) => [PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE].includes(permission))) redirect('/restricted')
  const { config } = await requireWorkspaceModule('pos')
  const operator = pageAuthorization
  const data = await getPosPageData(operator, config.enabledModules.includes('customers'))
  if (!data.activeBranch) throw new Error('No authorized POS branch is available')

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading
        theme="adaptive"
        icon={ReceiptText}
        title="Point of sale"
        description="Process complete sales with the payment methods configured for your workspace."
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {(operator.permissions.includes(PermissionEnum.SHIFT_MANAGE) || operator.permissions.includes(PermissionEnum.AUDIT_LOG_VIEW)) && (
              <Link href="/dashboard/pos/mpesa-reconciliation" className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300">M-Pesa reconciliation</Link>
            )}
              <PosSecurity branchId={data.activeBranch.id} initialPinSet={data.pinSet} />
          </div>
        }
      />
      <CashierShiftStrip workspace={data.cashierWorkspace} />
      <POSTerminal products={data.products} categories={data.categories} customers={data.customers} settings={data.settings} requiresAgeVerification={config.businessCategory === 'liquor_shop'} hasActiveShift={Boolean(data.cashierWorkspace.session)} canDiscount={operator.permissions.includes(PermissionEnum.POS_DISCOUNT)} canRefund={operator.permissions.includes(PermissionEnum.SALE_REFUND)} canHold={operator.permissions.includes(PermissionEnum.POS_HOLD)} />
    </div>
  )
}
