'use client'

import { useWorkspaceConfig } from '@/lib/context/workspace-context'
import { getDashboardLayout } from '@/lib/config/dashboard-widgets'
import { AdaptiveDashboard } from '@/components/dashboard/adaptive-dashboard'
import { GettingStartedChecklist } from '@/components/dashboard/getting-started-checklist'

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

  return (
    <div className="space-y-8">
      {/* Getting Started Section */}
      {config.template.gettingStartedTasks && (
        <GettingStartedChecklist
          businessName={config.name}
          templateName={config.template.name}
          tasks={config.template.gettingStartedTasks}
        />
      )}

      {/* Main Dashboard */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
        <AdaptiveDashboard layout={layout} />
      </div>
    </div>
  )
}
