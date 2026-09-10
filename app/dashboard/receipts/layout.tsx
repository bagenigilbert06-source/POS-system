import { requireDashboardAnyPermission } from '@/lib/auth/dashboard-access';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { PermissionEnum } from '@/lib/types/permissions';

export default async function ReceiptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAnyPermission([
    PermissionEnum.SALES_VIEW_OWN,
    PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.SALE_VIEW,
  ]);
  await requireWorkspaceModule('pos');
  return children;
}
