import { requireAnyPermission } from '@/lib/auth/authorization';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { PermissionEnum } from '@/lib/types/permissions';

export default async function ReceiptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnyPermission([
    PermissionEnum.SALES_VIEW_OWN,
    PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.SALE_VIEW,
  ]);
  await requireWorkspaceModule('pos');
  return children;
}
