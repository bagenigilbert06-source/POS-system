import type { Metadata } from 'next'
import { DashboardHome } from '@/components/dashboard/overview/dashboard-home'
import { redirect } from 'next/navigation'
import { getAuthorizationContext, getDefaultWorkspaceRoute } from '@/lib/auth/authorization'

export const metadata: Metadata = {
  title: 'Business overview | Pesaby',
  description: 'Review the operational records available in your Pesaby workspace.',
}

export default async function DashboardPage() {
  const destination = getDefaultWorkspaceRoute(await getAuthorizationContext())
  if (destination !== '/dashboard') redirect(destination)
  return <DashboardHome />
}
