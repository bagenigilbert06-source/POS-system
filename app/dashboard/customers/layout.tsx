import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
export default async function Layout({ children }: { children: React.ReactNode }) { await requireDashboardPermission(PermissionEnum.CUSTOMER_EDIT); await requireWorkspaceModule('customers'); return children }
