'use client'

import { useState } from 'react'
import { processRefund } from '@/app/actions/refunds'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Sale, SaleItem } from '@/lib/db/schema'

interface RefundDialogProps {
  sale: Sale & { items: SaleItem[] }
  onClose: () => void
  onSuccess: () => void
}

export function RefundDialog({ sale, onClose, onSuccess }: RefundDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(sale.items.map(i => i.id)))
  const [refundMethod, setRefundMethod] = useState<'cash' | 'mpesa' | 'credit'>('cash')
  const [refundReference, setRefundReference] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedSaleItems = sale.items.filter(i => selectedItems.has(i.id))
  const refundAmount = selectedSaleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)

  const handleRefund = async () => {
    if (selectedSaleItems.length === 0) {
      toast.error('Select at least one item to refund')
      return
    }
    if (!reason.trim()) {
      toast.error('Please provide a refund reason')
      return
    }

    setProcessing(true)
    try {
      await processRefund({
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        items: selectedSaleItems.map(item => ({
          saleItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
        })),
        totalAmount: refundAmount,
        refundMethod,
        refundReference: refundReference || undefined,
        reason,
      })
      setSuccess(true)
      toast.success('Refund processed successfully')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Refund Processed</h2>
          <p className="text-gray-600">Refund amount: {formatCurrency(refundAmount)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Process Refund</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items Selection */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Select Items to Refund</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sale.items.map(item => (
              <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
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
                  <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                </div>
                <div className="font-medium text-sm">{formatCurrency(parseFloat(item.totalPrice))}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Refund Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Refund Method</label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as 'cash' | 'mpesa' | 'credit')}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reference (Optional)</label>
            <input
              type="text"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              placeholder="M-Pesa/Check ref"
              className="w-full px-3 py-2 border rounded-lg"
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
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-lg font-bold">
            <span>Refund Amount:</span>
            <span>{formatCurrency(refundAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={processing || selectedSaleItems.length === 0 || !reason.trim()}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2',
              processing || selectedSaleItems.length === 0 || !reason.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
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
