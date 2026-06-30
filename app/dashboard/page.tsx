'use client'

import type { Metadata } from 'next'
import { useWorkspaceConfig } from '@/lib/context/workspace-context'
import { getDashboardLayout } from '@/lib/config/dashboard-widgets'
import { AdaptiveDashboard } from '@/components/dashboard/adaptive-dashboard'

export default function DashboardPage() {
  const config = useWorkspaceConfig()
  const layout = getDashboardLayout(config.template.id)

  if (!layout) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Dashboard configuration not found.</p>
      </div>
    )
  }

  return <AdaptiveDashboard layout={layout} />
}
