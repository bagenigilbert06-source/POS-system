'use client'

import { Package, DollarSign } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface InventoryMetricsCardsProps {
  inventory: {
    value: number
    units: number
  }
  currency: string
}

export function InventoryMetricsCards({ inventory, currency }: InventoryMetricsCardsProps) {
  const cards = [
    {
      label: 'Total Inventory Value',
      value: formatCurrency(inventory.value, currency),
      detail: 'At buying price',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Total Units in Stock',
      value: formatNumber(inventory.units),
      detail: 'Across all products',
      icon: Package,
      color: 'bg-blue-100 text-blue-600'
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
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
