'use client'

import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Banknote,
  CreditCard,
  Smartphone,
  X,
  Printer,
  Download,
  RotateCcw,
  Eye,
} from 'lucide-react'
import type { Sale, SaleItem, Customer } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface SalesDetailDrawerProps {
  sale: Sale & { items: SaleItem[] }
  customer?: Customer | null
  isOpen: boolean
  onClose: () => void
}

const paymentIcon = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
}

export function SalesDetailDrawer({
  sale,
  customer,
  isOpen,
  onClose,
}: SalesDetailDrawerProps) {
  if (!isOpen) return null

  const subtotal = parseFloat(sale.subtotal.toString())
  const taxAmount = parseFloat(sale.taxAmount.toString())
  const discountAmount = parseFloat(sale.discountAmount.toString())
  const total = parseFloat(sale.total.toString())

  const Icon = paymentIcon[sale.paymentMethod as keyof typeof paymentIcon] || Banknote

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-xl sm:rounded-l-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Transaction Details</h2>
            <p className="text-sm text-muted-foreground">Receipt #{sale.receiptNo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Status and Payment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-bold capitalize">{sale.status}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
                    <p className="mt-0.5 text-sm font-bold capitalize">
                      {sale.paymentMethod}{sale.mpesaRef ? ` · ${sale.mpesaRef}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer info */}
            {customer && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Customer</p>
                <div className="space-y-1">
                  <p className="text-sm font-bold">{customer.name}</p>
                  {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                  {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold mb-3">Items Sold</h3>
              <div className="space-y-2">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold tabular-nums">
                      {formatCurrency(parseFloat(item.totalPrice.toString()))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="tabular-nums font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
              <p>Date: {formatDateTime(sale.createdAt)}</p>
              <p>Transaction ID: {sale.id}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 p-4">
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
              <Download className="h-4 w-4" />
              PDF
            </button>
            {sale.status === 'completed' && (
              <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
                <RotateCcw className="h-4 w-4" />
                Return
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
