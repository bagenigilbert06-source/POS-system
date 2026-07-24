'use client'

import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Printer, Download } from 'lucide-react'
import type { Invoice } from '@/lib/db/schema'

interface InvoiceViewDialogProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceViewDialog({ invoice, open, onOpenChange }: InvoiceViewDialogProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoiceNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-4">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <p className="text-sm text-muted-foreground">Invoice No: {invoice.invoiceNo}</p>
            <p className="text-sm text-muted-foreground">
              Date: {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p className="text-sm text-muted-foreground">{invoice.customerId || 'Customer'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="font-medium">Status:</span> {invoice.status}
              </p>
              {invoice.dueDate && (
                <p className="text-sm">
                  <span className="font-medium">Due:</span> {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Professional Services</td>
                  <td className="text-center">1</td>
                  <td className="text-right">{formatCurrency(parseFloat(invoice.total.toString()))}</td>
                  <td className="text-right">{formatCurrency(parseFloat(invoice.total.toString()))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(parseFloat(invoice.subtotal.toString()))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Tax:</span>
                <span>{formatCurrency(parseFloat(invoice.taxAmount.toString()))}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(parseFloat(invoice.total.toString()))}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Notes:</h4>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p>Thank you for your business</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
