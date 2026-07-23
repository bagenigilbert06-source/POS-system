'use client'

import { useState } from 'react'
import { Plus, Minus, AlertTriangle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/db/schema'

interface StockActionPanelProps {
  product: Product
  onAdjust?: (quantity: number, reason: string) => void
  onWarning?: (message: string) => void
}

export function StockActionPanel({
  product,
  onAdjust,
  onWarning,
}: StockActionPanelProps) {
  const [quantity, setQuantity] = useState(1)
  const [action, setAction] = useState<'increase' | 'decrease' | null>(null)
  const [reason, setReason] = useState('manual_adjustment')
  const [showForm, setShowForm] = useState(false)

  const reasons = [
    { value: 'manual_adjustment', label: 'Manual Adjustment' },
    { value: 'stocktake', label: 'Stock Count' },
    { value: 'damage', label: 'Damaged Item' },
    { value: 'lost', label: 'Lost/Misplaced' },
    { value: 'transfer', label: 'Transfer Between Branches' },
    { value: 'return_from_customer', label: 'Return from Customer' },
    { value: 'other', label: 'Other' },
  ]

  const handleAdjust = async (type: 'increase' | 'decrease') => {
    const adjustmentQty = type === 'increase' ? quantity : -quantity
    const newStock = product.stock + adjustmentQty

    // Validate
    if (type === 'decrease' && quantity > product.stock) {
      onWarning?.(`Cannot reduce stock by ${quantity}. Current stock is only ${product.stock}.`)
      return
    }

    // Warning for low stock
    if (newStock > 0 && newStock <= product.minStock && type === 'decrease') {
      onWarning?.(`Warning: Stock will fall below minimum (${product.minStock}).`)
    }

    // Trigger callback
    onAdjust?.(adjustmentQty, reason)

    // Reset
    setShowForm(false)
    setQuantity(1)
    setReason('manual_adjustment')
  }

  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setAction('increase')
            setShowForm(!showForm)
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-colors',
            action === 'increase' && showForm
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          )}
        >
          <Plus className="h-4 w-4" />
          Add Stock
        </button>

        <button
          onClick={() => {
            setAction('decrease')
            setShowForm(!showForm)
          }}
          disabled={product.stock === 0}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            action === 'decrease' && showForm
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
          )}
        >
          <Minus className="h-4 w-4" />
          Remove Stock
        </button>
      </div>

      {/* Adjustment form */}
      {showForm && (
        <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/30">
          {/* Quantity input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quantity</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <Minus className="h-4 w-4 text-muted-foreground" />
              </button>
              <input
                type="number"
                min="1"
                max={action === 'decrease' ? product.stock : 999999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-2 py-1 text-center rounded border border-input bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {action === 'decrease'
                ? `${Math.max(0, product.stock - quantity)} items remaining`
                : `${product.stock + quantity} items total`}
            </p>
          </div>

          {/* Reason select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleAdjust(action as any)}
              className={cn(
                'flex-1 py-1.5 rounded-lg font-medium text-sm transition-colors text-white',
                action === 'increase'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setAction(null)
              }}
              className="flex-1 py-1.5 rounded-lg border border-input hover:bg-muted font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stock warning */}
      {product.stock === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">Out of stock</span>
        </div>
      )}

      {product.stock > 0 && product.stock <= product.minStock && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">Low stock alert</span>
        </div>
      )}
    </div>
  )
}
