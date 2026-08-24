import type { Metadata } from 'next';
import { Boxes } from 'lucide-react';
import { getProductsPageData } from '@/app/actions/products';
import { getInventoryControlData } from '@/app/actions/stock-adjustments';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { InventoryManager } from '@/components/inventory/inventory-manager';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { PermissionEnum } from '@/lib/types/permissions';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import { getCurrentProductTerminology } from '@/lib/products/current-terminology';

export async function generateMetadata(): Promise<Metadata> {
  const terminology = await getCurrentProductTerminology();
  return { title: terminology.title === 'Medicines' ? 'Medicine Inventory | Pesaby' : terminology.title === 'Stock Items' ? 'Store Inventory | Pesaby' : 'Inventory control | Pesaby' };
}
export const dynamic = 'force-dynamic';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ receive?: string }>;
}) {
  const authorization = await getAuthorizationContext();
  const initialReceiveProductId = (await searchParams)?.receive;
  const [{ organization, config }, products, control] = await Promise.all([
    requireWorkspaceModule('inventory'),
    getProductsPageData(),
    getInventoryControlData(),
  ]);
  const activeProducts = products.filter((item) => item.isActive);
  const pharmacy = isPharmacyBusiness(config.businessType, config.businessCategory);
  const liquorStore = config.businessCategory === 'liquor_shop';
  const canAdjust = authorization.permissions.includes(
    PermissionEnum.INVENTORY_ADJUST
  );
  const canReceive = authorization.permissions.includes(
    PermissionEnum.INVENTORY_RECEIVE
  );
  const canStartCounts = authorization.permissions.includes(
    PermissionEnum.INVENTORY_COUNT_START
  );
  const canSubmitAdjustments = authorization.permissions.includes(
    PermissionEnum.INVENTORY_ADJUST_SUBMIT
  );
  const canExport = authorization.permissions.includes(
    PermissionEnum.INVENTORY_EXPORT
  );
  const canApproveAdjustments =
    authorization.permissions.includes(
      PermissionEnum.INVENTORY_ADJUST_APPROVE
    ) ||
    authorization.permissions.includes(PermissionEnum.INVENTORY_COUNT_APPROVE);

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        theme="adaptive"
        icon={Boxes}
        eyebrow={pharmacy ? 'Pharmacy stock control' : liquorStore ? 'Liquor store stock control' : 'Stock control'}
        title={pharmacy ? 'Medicine Inventory' : liquorStore ? 'Store Inventory' : 'Inventory'}
        description={pharmacy ? 'Count, receive and audit medicine stock with batch and expiry controls.' : liquorStore ? 'Count, replenish and audit bottles, packs, cases and other store stock.' : 'Count, replenish, adjust and audit every change to stock on hand.'}
      />

      <InventoryManager
        products={activeProducts}
        movements={control.movements}
        adjustments={control.adjustments}
        adjustmentItems={control.adjustmentItems}
        balances={control.balances}
        branches={control.branches}
        currency={organization.currency}
        canAdjust={canAdjust}
        canReceive={canReceive}
        canStartCounts={canStartCounts}
        canSubmitAdjustments={canSubmitAdjustments}
        canExport={canExport}
        canApproveAdjustments={canApproveAdjustments}
        currentUserId={authorization.userId}
        initialReceiveProductId={initialReceiveProductId}
        canPurchase={false}
      />
    </div>
  );
}
