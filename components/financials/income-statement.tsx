'use client'

import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface IncomeStatementProps {
  data: {
    period: string
    revenue: number
    costOfGoods: number
    grossProfit: number
    operatingExpenses: number
    netIncome: number
  } | null
  currency: string
}

export function IncomeStatement({ data, currency }: IncomeStatementProps) {
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No income statement data available
      </div>
    )
  }

  const profitMargin = data.revenue > 0 ? (data.netIncome / data.revenue) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Income Statement</h3>
        <p className="text-sm text-muted-foreground">Period: {data.period}</p>
      </div>

      <div className="space-y-4">
        {/* Revenue Section */}
        <div className="border-b pb-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium">Revenue</span>
            <span className="font-semibold">{formatCurrency(data.revenue)}</span>
          </div>
        </div>

        {/* Cost of Goods */}
        <div className="border-b pb-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-muted-foreground">Cost of Goods Sold</span>
            <span className="text-muted-foreground">{formatCurrency(data.costOfGoods)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Gross Profit</span>
            <span>{formatCurrency(data.grossProfit)}</span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="border-b pb-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-muted-foreground">Operating Expenses</span>
            <span className="text-muted-foreground">{formatCurrency(data.operatingExpenses)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.netIncome)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {profitMargin > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span className={profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                  {profitMargin.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Profit Margin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
