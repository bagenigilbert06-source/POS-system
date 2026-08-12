import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceModule('reports')
  await requireDashboardPermission(PermissionEnum.REPORT_VIEW)
  return children
}
