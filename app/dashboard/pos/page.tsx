import { POSTerminal } from '@/components/pos/pos-terminal';
import type { Metadata } from 'next';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { requireAnyPermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { CashierShiftStrip } from '@/components/pos/cashier-shift-strip';
import { PosSecurity } from '@/components/pos/pos-security';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import { redirect } from 'next/navigation';
import { getPosPageData } from '@/lib/services/pos-page-service';
import { getCurrentSession } from '@/lib/auth';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';

export const metadata: Metadata = { title: 'POS Terminal' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function POSPage() {
  const posAuthorization = await getPosAuthorizationContext();
  const pageAuthorization =
    posAuthorization ??
    (await requireAnyPermission([
      PermissionEnum.POS_VIEW,
      PermissionEnum.POS_SELL,
      PermissionEnum.SALE_CREATE,
    ]));
  if (
    !pageAuthorization.permissions.some((permission) =>
      [
        PermissionEnum.POS_VIEW,
        PermissionEnum.POS_SELL,
        PermissionEnum.SALE_CREATE,
      ].includes(permission)
    )
  )
    redirect('/restricted');
  const { config } = await requireWorkspaceModule('pos');
  const operator = pageAuthorization;
  const data = await getPosPageData(
    operator,
    config.enabledModules.includes('customers'),
    isPharmacyBusiness(config.businessType, config.businessCategory)
  );
  const currentSession = await getCurrentSession();
  if (!data.activeBranch)
    throw new Error('No authorized POS branch is available');

  return (
    <div className="pos-workspace mx-auto max-w-[1480px] space-y-5">
      <CashierShiftStrip
        workspace={data.cashierWorkspace}
        canManageCash={operator.permissions.includes(
          PermissionEnum.SHIFT_MANAGE
        )}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PosSecurity
              branchId={data.activeBranch.id}
              initialPinSet={data.pinSet}
            />
          </div>
        }
      />
      <POSTerminal
        organizationId={operator.organizationId}
        products={data.products}
        categories={data.categories}
        customers={data.customers}
        settings={data.settings}
        requiresAgeVerification={config.businessCategory === 'liquor_shop'}
        pharmacyMode={isPharmacyBusiness(config.businessType, config.businessCategory)}
        hasActiveShift={Boolean(data.cashierWorkspace.session)}
        canDiscount={operator.permissions.includes(PermissionEnum.POS_DISCOUNT)}
        canRefund={operator.permissions.includes(PermissionEnum.SALE_REFUND)}
        canHold={operator.permissions.includes(PermissionEnum.POS_HOLD)}
        canApproveRestricted={operator.permissions.includes(PermissionEnum.PHARMACY_RESTRICTED_APPROVE)}
        receiptContext={{
          cashierName: currentSession?.user?.name || undefined,
          registerName: data.cashierWorkspace.registerName,
          locationName: data.cashierWorkspace.locationName,
        }}
        offlineContext={{
          sessionId: data.cashierWorkspace.session?.id ?? null,
          branchId: data.activeBranch.id,
          terminalId: data.cashierWorkspace.session?.terminalId ?? null,
        }}
      />
    </div>
  );
}
