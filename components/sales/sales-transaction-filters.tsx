'use client'

import { Search, Calendar, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface SalesFiltersProps {
  onSearchChange: (search: string) => void
  onStatusChange: (status: 'all' | 'completed' | 'pending') => void
  onPaymentMethodChange: (method: 'all' | 'cash' | 'mpesa' | 'card') => void
  onDateRangeChange?: (from: Date | null, to: Date | null) => void
}

export function SalesTransactionFilters({
  onSearchChange,
  onStatusChange,
  onPaymentMethodChange,
  onDateRangeChange,
}: SalesFiltersProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'completed' | 'pending'>('all')
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'mpesa' | 'card'>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const handleStatusChange = (value: 'all' | 'completed' | 'pending') => {
    setStatus(value)
    onStatusChange(value)
  }

  const handlePaymentChange = (value: 'all' | 'cash' | 'mpesa' | 'card') => {
    setPaymentMethod(value)
    onPaymentMethodChange(value)
  }

  const handleReset = () => {
    handleSearchChange('')
    handleStatusChange('all')
    handlePaymentChange('all')
    setShowAdvanced(false)
  }

  const isFiltered = search || status !== 'all' || paymentMethod !== 'all'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by receipt #, customer, or reference..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Basic filters */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>

        {/* Payment method filter */}
        <select
          value={paymentMethod}
          onChange={(e) => handlePaymentChange(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
        </select>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
            showAdvanced
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-input hover:bg-muted'
          )}
        >
          <Filter className="h-4 w-4" />
          Advanced
        </button>

        {/* Reset button */}
        {isFiltered && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-input hover:bg-muted text-sm font-medium transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="border-t pt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Amount Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min amount"
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                placeholder="Max amount"
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
