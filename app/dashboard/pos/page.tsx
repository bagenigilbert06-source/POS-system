import { getProductCategories, getProducts } from '@/app/actions/products'
import { getCustomers } from '@/app/actions/customers'
import { getBusinessSettings } from '@/app/actions/business'
import { POSTerminal } from '@/components/pos/pos-terminal'
import type { Metadata } from 'next'
import { ReceiptText } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getCashierWorkspace } from '@/app/actions/operations'
import { CashierShiftStrip } from '@/components/pos/cashier-shift-strip'
import { PosSecurity } from '@/components/pos/pos-security'
import { db } from '@/lib/db'
import { branch } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { getCurrentSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata: Metadata = { title: 'POS Terminal' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function POSPage() {
  const posAuthorization = await getPosAuthorizationContext()
  if (!(await getCurrentSession())?.user && !posAuthorization) redirect('/sign-in')
  const pageAuthorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!pageAuthorization.permissions.some((permission) => [PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE].includes(permission))) redirect('/restricted')
  const { config } = await requireWorkspaceModule('pos')
  const authorization = posAuthorization ?? await getAuthorizationContext()
  const operator = authorization
  const [activeBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, authorization.organizationId), authorization.isOrganizationWide ? eq(branch.isMain, true) : eq(branch.id, authorization.branchIds[0] ?? ''))).limit(1)
  if (!activeBranch) throw new Error('No authorized POS branch is available')
  const [products, categories, customers, settings, cashierWorkspace] = await Promise.all([
    getProducts(),
    getProductCategories(),
    config.enabledModules.includes('customers') ? getCustomers() : Promise.resolve([]),
    getBusinessSettings(),
    getCashierWorkspace(),
  ])

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
            <PosSecurity branchId={activeBranch.id} />
          </div>
        }
      />
      <CashierShiftStrip workspace={cashierWorkspace} />
      <POSTerminal products={products} categories={categories} customers={customers} settings={settings} requiresAgeVerification={config.businessCategory === 'liquor_shop'} hasActiveShift={Boolean(cashierWorkspace.session)} canDiscount={operator.permissions.includes(PermissionEnum.POS_DISCOUNT)} canRefund={operator.permissions.includes(PermissionEnum.SALE_REFUND)} canHold={operator.permissions.includes(PermissionEnum.POS_HOLD)} />
    </div>
  )
}
