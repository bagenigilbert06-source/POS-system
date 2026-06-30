'use client'

import { DashboardWidget as DashboardWidgetType } from '@/lib/config/dashboard-widgets'
import { MetricWidget } from './widgets/metric-widget'
import { ChartWidget } from './widgets/chart-widget'
import { TableWidget } from './widgets/table-widget'

interface DashboardWidgetProps {
  widget: DashboardWidgetType
}

export function DashboardWidget({ widget }: DashboardWidgetProps) {
  switch (widget.type) {
    case 'metric':
      return <MetricWidget widget={widget} />
    case 'chart':
      return <ChartWidget widget={widget} />
    case 'table':
      return <TableWidget widget={widget} />
    case 'list':
      return <TableWidget widget={widget} />
    default:
      return (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">{widget.title}</p>
          <p className="text-xs text-muted-foreground mt-1">Widget type not implemented</p>
        </div>
      )
  }
}
