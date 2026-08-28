import type { Metadata } from 'next';
import { getPromotions } from '@/app/actions/promotions';
import { PromotionsManager } from '@/components/promotions/promotions-manager';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Coupons | Pesaby' };
export default async function CouponsPage() {
  await requireDashboardPermission(PermissionEnum.REWARDS_VIEW);
  return (
    <PromotionsManager
      kind="coupon"
      initialPromotions={await getPromotions('coupon')}
    />
  );
}
