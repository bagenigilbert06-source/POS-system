'use client'

import { DashboardWidget } from '@/lib/config/dashboard-widgets'

interface TableWidgetProps {
  widget: DashboardWidget
}

export function TableWidget({ widget }: TableWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4 md:col-span-2">
      <div>
        <p className="text-sm font-medium">{widget.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{widget.module}</p>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 rounded bg-muted/30 animate-pulse"
          >
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ))}
      </div>
    </div>
  )
}
