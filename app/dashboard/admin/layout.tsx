import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  return children
}
