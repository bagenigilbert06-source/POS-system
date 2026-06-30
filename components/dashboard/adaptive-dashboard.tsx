'use client'

import { DashboardLayout, DashboardWidget } from '@/lib/config/dashboard-widgets'
import { DashboardWidget as Widget } from './dashboard-widget'

interface AdaptiveDashboardProps {
  layout: DashboardLayout
}

export function AdaptiveDashboard({ layout }: AdaptiveDashboardProps) {
  // Sort widgets by order
  const sortedWidgets = [...layout.widgets].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{layout.name}</h1>
        <p className="text-muted-foreground mt-1">
          {layout.modules.length} modules enabled
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedWidgets.map((widget) => (
          <Widget key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  )
}
