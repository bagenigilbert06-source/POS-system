'use client'

import { useState } from 'react'
import { processRefund } from '@/app/actions/refunds'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { X, CheckCircle2 } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { notify } from '@/lib/notify'
import type { Sale, SaleItem } from '@/lib/db/schema'
import { calculateRefundAmount } from '@/lib/pos/refund-calculation'

interface RefundDialogProps {
  sale: Sale & { items: SaleItem[] }
  onClose: () => void
  onSuccess: (items: SaleItem[]) => void
}

export function RefundDialog({ sale, onClose, onSuccess }: RefundDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(sale.items.map(i => i.id)))
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(sale.items.map((item) => [item.id, item.quantity])))
  const [refundMethod, setRefundMethod] = useState<'cash' | 'mpesa' | 'credit'>('cash')
  const [refundReference, setRefundReference] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedSaleItems = sale.items.filter(i => selectedItems.has(i.id))
  const saleSubtotal = Number(sale.subtotal)
  const saleTotal = Number(sale.total)
  const refundAmount = saleSubtotal > 0 ? calculateRefundAmount(saleSubtotal, saleTotal, selectedSaleItems.map((item) => ({
    lineSubtotal: Number(item.totalPrice), soldQuantity: item.quantity, refundQuantity: quantities[item.id] ?? item.quantity,
  }))) : 0

  const handleRefund = async () => {
    if (selectedSaleItems.length === 0) {
      notify.error('Select at least one item to refund')
      return
    }
    if (reason.trim().length < 3) {
      notify.error('Please provide a refund reason of at least 3 characters')
      return
    }
    if (refundMethod === 'mpesa' && !refundReference.trim()) {
      notify.error('Enter the confirmed M-Pesa refund reference')
      return
    }

    setProcessing(true)
    try {
      await notify.track(() => processRefund({
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        items: selectedSaleItems.map(item => ({
          saleItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: quantities[item.id] ?? item.quantity,
          unitPrice: parseFloat(item.unitPrice),
        })),
        totalAmount: refundAmount,
        refundMethod,
        refundReference: refundReference || undefined,
        reason,
      }), {
        loading: 'Processing refundâ€¦',
        success: 'Refund processed',
        error: (error) => error instanceof Error ? error.message : 'Failed to process refund',
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess(selectedSaleItems)
        onClose()
      }, 1500)
    } catch { /* notify.track reports the failure */ } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background text-foreground border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Refund Processed</h2>
          <p className="text-muted-foreground">Refund amount: {formatCurrency(refundAmount)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="pos-scroll-region bg-background text-foreground border border-border rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Process Refund</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items Selection */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-2">Select Items to Refund</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sale.items.map(item => (
              <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedItems)
                    if (e.target.checked) newSelected.add(item.id)
                    else newSelected.delete(item.id)
                    setSelectedItems(newSelected)
                  }}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">Sold: {item.quantity}</div>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Return <input type="number" min="1" max={item.quantity} value={quantities[item.id] ?? item.quantity} disabled={!selectedItems.has(item.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Math.min(item.quantity, Number(event.target.value) || 1)) }))} className="w-14 rounded border border-input bg-background text-foreground px-1 py-1" /></label>
                <div className="font-medium text-sm">{formatCurrency(parseFloat(item.totalPrice))}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Refund Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-sm font-medium mb-2">Refund Method</label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as 'cash' | 'mpesa' | 'credit')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reference {refundMethod === 'mpesa' ? '(Required)' : '(Optional)'}</label>
            <input
              type="text"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              placeholder="M-Pesa/Check ref"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Reason for Refund</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this refund being processed?"
            rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Total */}
        <div className="border-t border-border py-3 mb-5">
          <div className="flex justify-between text-sm font-semibold">
            <span>Refund Amount:</span>
            <span>{formatCurrency(refundAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={processing || selectedSaleItems.length === 0 || reason.trim().length < 3 || (refundMethod === 'mpesa' && !refundReference.trim())}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2',
              processing || selectedSaleItems.length === 0 || reason.trim().length < 3 || (refundMethod === 'mpesa' && !refundReference.trim())
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            Process Refund
          </button>
        </div>
      </div>
    </div>
  )
}
