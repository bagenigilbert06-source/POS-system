'use client'

import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, DollarSign, Percent } from 'lucide-react'

interface ProfitLossCardsProps {
  data: {
    revenue: number
    cogs: number
    grossProfit: number
    expenses: number
    operatingProfit: number
    profitMargin: number
  }
  currency: string
}

export function ProfitLossCards({ data, currency }: ProfitLossCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data.revenue, currency),
      detail: 'Total sales today',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Cost of Goods Sold',
      value: formatCurrency(data.cogs, currency),
      detail: 'Product costs',
      icon: DollarSign,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(data.grossProfit, currency),
      detail: 'Revenue - COGS',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Operating Expenses',
      value: formatCurrency(data.expenses, currency),
      detail: 'Total expenses today',
      icon: DollarSign,
      color: 'bg-red-100 text-red-600'
    },
    {
      label: 'Operating Profit',
      value: formatCurrency(data.operatingProfit, currency),
      detail: 'Gross Profit - Expenses',
      icon: TrendingUp,
      color: data.operatingProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
    },
    {
      label: 'Profit Margin',
      value: `${data.profitMargin.toFixed(2)}%`,
      detail: 'Operating Profit / Revenue',
      icon: Percent,
      color: data.profitMargin >= 15 ? 'bg-green-100 text-green-600' : data.profitMargin >= 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
            <div className="px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#667085]">{card.label}</p>
                  <p className="mt-3 text-[1.55rem] font-bold text-[#050a1f]">{card.value}</p>
                  <p className="mt-1 text-xs text-[#8a94a5]">{card.detail}</p>
                </div>
                <div className={`rounded-lg p-3 ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
