import type { Metadata } from 'next';
import { getPromotions } from '@/app/actions/promotions';
import { PromotionsManager } from '@/components/promotions/promotions-manager';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Bonuses | Pesaby' };
export default async function BonusesPage() {
  await requireDashboardPermission(PermissionEnum.REWARDS_VIEW);
  return (
    <PromotionsManager
      kind="bonus"
      initialPromotions={await getPromotions('bonus')}
    />
  );
}
