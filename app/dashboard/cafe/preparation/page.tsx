import type { Metadata } from 'next';
import { ChefHat } from 'lucide-react';
import { getCafePreparationQueue } from '@/app/actions/cafe';
import { PreparationBoard } from '@/components/cafe/preparation-board';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Preparation | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function CafePreparationPage() {
  const [authorization, queue] = await Promise.all([getAuthorizationContext(), getCafePreparationQueue()]);
  return <div className="mx-auto w-full max-w-[1560px] space-y-5 pb-8">
    <DashboardPageHeading theme="adaptive" icon={ChefHat} eyebrow="Café operations" title="Preparation" description="Move paid prepared orders from new to preparing, ready and completed." />
    <PreparationBoard initialData={queue} canManage={authorization.permissions.includes(PermissionEnum.KITCHEN_QUEUE_MANAGE)} />
  </div>;
}
