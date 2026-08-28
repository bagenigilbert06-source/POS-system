import type { Metadata } from 'next';
import { getPromotions } from '@/app/actions/promotions';
import { PromotionsManager } from '@/components/promotions/promotions-manager';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Discounts | Pesaby' };
export default async function DiscountsPage() {
  await requireDashboardPermission(PermissionEnum.REWARDS_VIEW);
  return (
    <PromotionsManager
      kind="discount"
      initialPromotions={await getPromotions('discount')}
    />
  );
}
