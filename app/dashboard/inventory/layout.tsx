import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceModule('inventory')
  await requireDashboardPermission(PermissionEnum.INVENTORY_VIEW)
  return children
}
