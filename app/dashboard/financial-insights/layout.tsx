import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
export default async function Layout({children}:{children:React.ReactNode}){await requireDashboardPermission(PermissionEnum.FINANCE_VIEW);return children}
