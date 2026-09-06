import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await Promise.all([
    requireDashboardPermission(PermissionEnum.PRODUCT_EDIT),
    requireWorkspaceModule('products'),
  ])
  return children
}
