'use client'

import { formatCurrency } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface CashFlowStatementProps {
  data: {
    operatingActivities: number
    investingActivities: number
    financingActivities: number
    netCashChange: number
  } | null
  currency: string
}

export function CashFlowStatement({ data, currency }: CashFlowStatementProps) {
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No cash flow data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
        <p className="text-sm text-muted-foreground">Cash movements by activity</p>
      </div>

      <div className="space-y-4">
        {/* Operating Activities */}
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <h4 className="mb-2 font-medium text-green-900">Operating Activities</h4>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(data.operatingActivities)}</p>
          <p className="text-xs text-green-700/70 mt-1">Cash from core business operations</p>
        </div>

        {/* Investing Activities */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="mb-2 font-medium text-blue-900">Investing Activities</h4>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.investingActivities)}</p>
          <p className="text-xs text-blue-700/70 mt-1">Cash from investments</p>
        </div>

        {/* Financing Activities */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
          <h4 className="mb-2 font-medium text-purple-900">Financing Activities</h4>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.financingActivities)}</p>
          <p className="text-xs text-purple-700/70 mt-1">Cash from financing</p>
        </div>

        {/* Net Cash Change */}
        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Change in Cash</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.netCashChange)}</p>
            </div>
            {data.netCashChange > 0 && (
              <TrendingUp className="h-8 w-8 text-green-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
