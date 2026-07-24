'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Eye, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteInvoice } from '@/app/actions/invoice-actions'
import { InvoiceViewDialog } from './invoice-view-dialog'
import type { Invoice } from '@/lib/db/schema'

interface InvoicesTableProps {
  invoices: Invoice[]
  orgId: string
}

export function InvoicesTable({ invoices, orgId }: InvoicesTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    setIsDeleting(true)
    try {
      await deleteInvoice(invoiceId)
      toast.success('Invoice deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete invoice')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-700 bg-green-100'
      case 'sent':
        return 'text-blue-700 bg-blue-100'
      case 'overdue':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No invoices found</p>
          <p className="text-xs text-muted-foreground">Create your first invoice to get started</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-muted">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-muted/50 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.customerId || 'General'}</td>
                <td className="px-4 py-3">{formatCurrency(parseFloat(inv.total.toString()))}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(inv.status)}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedInvoice(inv)
                        setShowViewDialog(true)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(inv.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <InvoiceViewDialog
          invoice={selectedInvoice}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      )}
    </>
  )
}
