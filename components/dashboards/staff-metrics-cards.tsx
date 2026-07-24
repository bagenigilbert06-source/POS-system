'use client'

import { Users, TrendingUp, Target } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface StaffMetricsCardsProps {
  metrics: {
    totalStaff: number
    activeStaff: number
    totalSalesValue: number
    totalTransactions: number
    avgPerStaff: number
  }
  currency: string
}

export function StaffMetricsCards({ metrics, currency }: StaffMetricsCardsProps) {
  const cards = [
    {
      label: 'Total Staff',
      value: formatNumber(metrics.totalStaff),
      detail: 'In organization',
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Active Today',
      value: formatNumber(metrics.activeStaff),
      detail: 'Made sales today',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Total Sales',
      value: formatCurrency(metrics.totalSalesValue, currency),
      detail: 'Combined revenue',
      icon: Target,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      label: 'Transactions',
      value: formatNumber(metrics.totalTransactions),
      detail: 'Completed today',
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      label: 'Avg Sales/Staff',
      value: formatCurrency(metrics.avgPerStaff, currency),
      detail: 'Per active staff member',
      icon: Target,
      color: 'bg-pink-100 text-pink-600'
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#667085]">{card.label}</p>
                  <p className="mt-2 text-lg font-bold text-[#050a1f]">{card.value}</p>
                  <p className="mt-1 text-xs text-[#8a94a5]">{card.detail}</p>
                </div>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
