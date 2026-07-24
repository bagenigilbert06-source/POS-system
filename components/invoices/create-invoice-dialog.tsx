'use client'

import { useState } from 'react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createInvoice } from '@/app/actions/invoice-actions'

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }])
  const [formData, setFormData] = useState({
    invoiceNo: `INV-${Date.now()}`,
    customerId: '',
    notes: '',
    dueDate: '',
  })

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return toast.error('Add at least one item')
    if (items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      return toast.error('Fill in all item details')
    }

    setIsLoading(true)
    try {
      await createInvoice({
        invoiceNo: formData.invoiceNo,
        customerId: formData.customerId || undefined,
        items,
        notes: formData.notes || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      })
      toast.success('Invoice created successfully')
      setFormData({
        invoiceNo: `INV-${Date.now()}`,
        customerId: '',
        notes: '',
        dueDate: '',
      })
      setItems([{ description: '', quantity: 1, unitPrice: 0 }])
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>Create and send invoices to customers.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Number*</label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Customer ID (Optional)</label>
            <input
              type="text"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              placeholder="CUST-001"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Items*</label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => {
                    const newItems = [...items]
                    newItems[idx].description = e.target.value
                    setItems(newItems)
                  }}
                  placeholder="Item description"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...items]
                    newItems[idx].quantity = parseInt(e.target.value) || 0
                    setItems(newItems)
                  }}
                  placeholder="Qty"
                  className="w-20 rounded-lg border px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const newItems = [...items]
                    newItems[idx].unitPrice = parseFloat(e.target.value) || 0
                    setItems(newItems)
                  }}
                  placeholder="Price"
                  className="w-24 rounded-lg border px-3 py-2 text-sm"
                  required
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Totals */}
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>KES {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (16%):</span>
              <span>KES {tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total:</span>
              <span>KES {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or terms..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
