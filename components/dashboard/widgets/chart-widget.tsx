'use client'

import { DashboardWidget } from '@/lib/config/dashboard-widgets'

interface ChartWidgetProps {
  widget: DashboardWidget
}

export function ChartWidget({ widget }: ChartWidgetProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 space-y-4 md:col-span-2`}>
      <div>
        <p className="text-sm font-medium">{widget.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{widget.module}</p>
      </div>
      <div className="h-64 flex items-center justify-center bg-muted/30 rounded">
        <p className="text-sm text-muted-foreground">Chart placeholder</p>
      </div>
    </div>
  )
}
