import { POSTerminal } from '@/components/pos/pos-terminal';
import type { Metadata } from 'next';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { getDashboardAuthorization } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { CashierShiftStrip } from '@/components/pos/cashier-shift-strip';
import { PosSecurity } from '@/components/pos/pos-security';
import { getPosAuthorizationContext, getTerminal } from '@/lib/pos/pos-auth';
import { redirect } from 'next/navigation';
import { getPosPageData } from '@/lib/services/pos-page-service';
import { getCurrentSession } from '@/lib/auth';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export const metadata: Metadata = { title: 'Point of Sale' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function POSPage() {
  // Full dashboard authentication takes precedence over an old terminal PIN
  // session, which prevents a previous store's terminal cookie from taking a
  // newly signed-in owner into the wrong workspace.
  const pageAuthorization = await getDashboardAuthorization();
  // The POS workspace must observe its terminal PIN session even while the
  // operator also has a full dashboard session. Dashboard authentication still
  // controls every other route; here the PIN session is what unlocks cashier
  // operations such as opening a shift.
  const candidatePosAuthorization = await getPosAuthorizationContext();
  const posAuthorization =
    candidatePosAuthorization?.organizationId === pageAuthorization.organizationId
      ? candidatePosAuthorization
      : null;
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
  // Dashboard-mode POS uses the same signed registered-terminal cookie as
  // shift actions, including before an active shift exists.
  const registeredTerminal = posAuthorization ? null : await getTerminal();
  const terminal =
    registeredTerminal &&
    registeredTerminal.organizationId === pageAuthorization.organizationId &&
    (pageAuthorization.isOrganizationWide ||
      pageAuthorization.branchIds.includes(registeredTerminal.branchId))
      ? registeredTerminal
      : null;
  const operator = posAuthorization ?? (terminal
    ? { ...pageAuthorization, branchIds: [terminal.branchId], isOrganizationWide: false, terminalId: terminal.id }
    : pageAuthorization);
  const [data, currentSession] = await Promise.all([
    getPosPageData(
      operator,
      config.enabledModules.includes('customers'),
      isPharmacyBusiness(config.businessType, config.businessCategory),
      isCafeBusiness(config.businessType, config.businessCategory)
    ),
    getCurrentSession(),
  ]);
  if (!data.activeBranch)
    throw new Error('No authorized POS branch is available');

  return (
    <div className="pos-workspace flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-[#f4f6f8] p-3 pb-[62px] dark:bg-[var(--dashboard-canvas)] sm:p-4 sm:pb-[64px]">
      <CashierShiftStrip
        workspace={data.cashierWorkspace}
        posUnlocked={Boolean(posAuthorization)}
        canManageCash={operator.permissions.includes(
          PermissionEnum.SHIFT_MANAGE
        )}
        directDrawerConfigured={
          data.settings.receiptPrintingMode === 'direct' &&
          Boolean(data.settings.receiptPrinterName)
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PosSecurity
              branchId={data.activeBranch.id}
              initialPinSet={data.pinSet}
              terminalRegistered={Boolean(terminal ?? posAuthorization?.terminalId)}
            />
          </div>
        }
      />
      <POSTerminal
        standalone
        organizationId={operator.organizationId}
        products={data.products}
        categories={data.categories}
        customers={data.customers}
        settings={data.settings}
        requiresAgeVerification={config.businessCategory === 'liquor_shop'}
        pharmacyMode={isPharmacyBusiness(
          config.businessType,
          config.businessCategory
        )}
        cafeMode={isCafeBusiness(config.businessType, config.businessCategory)}
        cafeExperience={data.cafe}
        hasActiveShift={Boolean(data.cashierWorkspace.session)}
        canDiscount={operator.permissions.includes(PermissionEnum.POS_DISCOUNT)}
        canRefund={operator.permissions.includes(PermissionEnum.SALE_REFUND)}
        canHold={operator.permissions.includes(PermissionEnum.POS_HOLD)}
        canRedeemRewards={operator.permissions.includes(
          PermissionEnum.REWARDS_REDEEM
        )}
        canApproveRestricted={operator.permissions.includes(
          PermissionEnum.PHARMACY_RESTRICTED_APPROVE
        )}
        canOverrideAgeVerification={operator.permissions.includes(
          PermissionEnum.AGE_VERIFICATION_OVERRIDE
        )}
        receiptContext={{
          cashierName: data.cashierWorkspace.cashierName || currentSession?.user?.name || undefined,
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
