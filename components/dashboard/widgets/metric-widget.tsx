'use client'

import { DashboardWidget } from '@/lib/config/dashboard-widgets'

interface MetricWidgetProps {
  widget: DashboardWidget
}

export function MetricWidget({ widget }: MetricWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">{widget.title}</p>
      <div className="space-y-1">
        <p className="text-2xl font-bold">--</p>
        <p className="text-xs text-muted-foreground">
          {widget.description || 'Loading...'}
        </p>
      </div>
    </div>
  )
}
