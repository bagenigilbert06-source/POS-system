'use client'

import { formatCurrency } from '@/lib/utils'

interface BalanceSheetProps {
  data: {
    assets: {
      cash: number
      inventory: number
      receivables: number
    }
    liabilities: {
      payable: number
    }
    equity: number
  } | null
  currency: string
}

export function BalanceSheet({ data, currency }: BalanceSheetProps) {
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No balance sheet data available
      </div>
    )
  }

  const totalAssets = data.assets.cash + data.assets.inventory + data.assets.receivables
  const totalLiabilities = data.liabilities.payable

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Balance Sheet</h3>
        <p className="text-sm text-muted-foreground">Assets = Liabilities + Equity</p>
      </div>

      <div className="space-y-4">
        {/* Assets */}
        <div className="border-b pb-4">
          <h4 className="mb-3 font-medium text-primary">Assets</h4>
          <div className="space-y-2 pl-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cash</span>
              <span>{formatCurrency(data.assets.cash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Inventory</span>
              <span>{formatCurrency(data.assets.inventory)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receivables</span>
              <span>{formatCurrency(data.assets.receivables)}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
            <span>Total Assets</span>
            <span>{formatCurrency(totalAssets)}</span>
          </div>
        </div>

        {/* Liabilities */}
        <div className="border-b pb-4">
          <h4 className="mb-3 font-medium text-primary">Liabilities</h4>
          <div className="space-y-2 pl-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accounts Payable</span>
              <span>{formatCurrency(data.liabilities.payable)}</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
            <span>Total Liabilities</span>
            <span>{formatCurrency(totalLiabilities)}</span>
          </div>
        </div>

        {/* Equity */}
        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex justify-between">
            <span className="font-semibold">Total Equity</span>
            <span className="font-bold text-primary">{formatCurrency(data.equity)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
