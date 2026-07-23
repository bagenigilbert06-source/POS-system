import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleItem } from '@/lib/db/schema'

interface ReceiptTemplateProps {
  sale: Sale & { items: SaleItem[] }
  businessName?: string
  businessPhone?: string
  businessAddress?: string
  receiptFooter?: string
  cashierName?: string
  customerName?: string
}

export function ReceiptTemplate({
  sale,
  businessName = 'Business',
  businessPhone = '',
  businessAddress = '',
  receiptFooter = 'Thank you for your business!',
  cashierName = 'Cashier',
  customerName = 'Customer',
}: ReceiptTemplateProps) {
  const subtotal = parseFloat(sale.subtotal.toString())
  const taxAmount = parseFloat(sale.taxAmount.toString())
  const discountAmount = parseFloat(sale.discountAmount.toString())
  const total = parseFloat(sale.total.toString())

  return (
    <div className="w-full max-w-xs mx-auto font-mono text-xs print:p-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .receipt { page-break-after: avoid; }
        }
      `}</style>
      
      <div className="receipt border p-4 bg-white text-black">
        {/* Header */}
        <div className="text-center border-b pb-3 mb-3">
          <h1 className="font-bold text-sm">{businessName}</h1>
          {businessAddress && <p className="text-[10px] mt-1">{businessAddress}</p>}
          {businessPhone && <p className="text-[10px]">{businessPhone}</p>}
        </div>

        {/* Receipt Number and Date */}
        <div className="border-b pb-2 mb-2 text-center">
          <p className="font-bold">RECEIPT #{sale.receiptNo}</p>
          <p className="text-[10px]">{formatDateTime(sale.createdAt)}</p>
        </div>

        {/* Cashier and Customer */}
        <div className="border-b pb-2 mb-2 text-[10px]">
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{customerName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-b pb-2 mb-2">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b">
                <th className="text-left">Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="text-left">{item.productName}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(parseFloat(item.totalPrice.toString()))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="border-b pb-2 mb-2 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax (16%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount:</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="border-b pb-2 mb-2 text-[10px]">
          <p>Payment: <span className="font-bold capitalize">{sale.paymentMethod}</span></p>
          {sale.mpesaRef && <p>M-Pesa Ref: {sale.mpesaRef}</p>}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] pt-2">
          <p>{receiptFooter}</p>
          <p className="mt-1 text-[9px] text-gray-500">Transaction ID: {sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Printable marker */}
        <div className="mt-4 pt-2 border-t text-center text-[9px] text-gray-500">
          <p>--- COPY FOR CUSTOMER ---</p>
        </div>
      </div>
    </div>
  )
}
