import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
// Cashiers need to be able to browse customers for checkout, while mutations
// remain protected by the edit permission in the customer actions/UI.
export default async function Layout({ children }: { children: React.ReactNode }) { await requireDashboardPermission(PermissionEnum.CUSTOMER_VIEW); await requireWorkspaceModule('customers'); return children }
