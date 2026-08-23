import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Workspace settings | Pesaby' }

export default async function SettingsPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.SETTINGS_VIEW
  )

  redirect(
    authorization.permissions.includes(PermissionEnum.ADMIN_ACCESS)
      ? '/dashboard/admin/profile'
      : '/dashboard'
  )
}
