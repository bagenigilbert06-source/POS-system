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
  }
}
