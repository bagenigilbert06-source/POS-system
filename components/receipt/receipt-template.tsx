import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleItem } from '@/lib/db/schema'
import { ReceiptQrCode } from './receipt-qr-code'
import Image from 'next/image'

interface ReceiptTemplateProps {
  sale: Pick<Sale, 'id' | 'receiptNo' | 'createdAt' | 'subtotal' | 'taxAmount' | 'discountAmount' | 'total' | 'paymentMethod' | 'mpesaRef'> & {
    items: Array<Pick<SaleItem, 'id' | 'productName' | 'productId' | 'quantity' | 'totalPrice'>>
  }
  businessName?: string
  businessPhone?: string
  businessAddress?: string
  receiptFooter?: string
  cashierName?: string
  customerName?: string
  taxName?: string
  showPhone?: boolean
  showAddress?: boolean
  showCashier?: boolean
  showCustomer?: boolean
  showPayment?: boolean
  showQrCode?: boolean
  showItemSku?: boolean
  layout?: 'detailed' | 'thermal'
  template?: 'classic' | 'logo' | 'cafe'
  logoUrl?: string
}

export function ReceiptTemplate({
  sale,
  businessName = 'Business',
  businessPhone = '',
  businessAddress = '',
  receiptFooter = 'Thank you for your business!',
  cashierName = 'Cashier',
  customerName = 'Customer',
  taxName = 'Tax',
  showPhone = true,
  showAddress = true,
  showCashier = true,
  showCustomer = true,
  showPayment = true,
  showQrCode = false,
  showItemSku = false,
  layout = 'detailed',
  template = 'classic',
  logoUrl = '',
}: ReceiptTemplateProps) {
  const subtotal = parseFloat(sale.subtotal.toString())
  const taxAmount = parseFloat(sale.taxAmount.toString())
  const discountAmount = parseFloat(sale.discountAmount.toString())
  const total = parseFloat(sale.total.toString())

  if (layout === 'thermal') {
    const cafe = template === 'cafe'
    const logo = template === 'logo'
    return <div className="receipt-paper mx-auto w-full max-w-[320px] bg-white px-5 py-6 font-mono text-[11px] leading-5 text-zinc-900 print:max-w-none print:p-0">
      <div className="text-center">{logo && (logoUrl ? <span className="mb-2 flex h-14 items-center justify-center"><Image src={logoUrl} alt={`${businessName} logo`} width={180} height={56} unoptimized className="h-14 w-auto max-w-[180px] object-contain" /></span> : <div className="mb-2 text-2xl font-black tracking-[0.22em]">LOGO</div>)}<h1 className={`text-sm font-bold uppercase tracking-wide ${cafe ? 'text-base' : ''}`}>{businessName}</h1>{showAddress && businessAddress && <p>{businessAddress}</p>}{showPhone && businessPhone && <p>{businessPhone}</p>}{cafe && <p className="mt-2">Store #{sale.id.slice(0, 5).toUpperCase()} · {formatDateTime(sale.createdAt)}</p>}</div>
      <div className="my-4 border-y-2 border-dotted border-zinc-900 py-2 text-center"><p className="font-bold tracking-wide">RECEIPT</p><p>{formatDateTime(sale.createdAt)}</p><p>#{sale.receiptNo}</p></div>
      <div className="mb-3 grid grid-cols-[1fr_32px_72px] gap-1 border-b border-dotted border-zinc-700 pb-1 text-[10px] font-bold uppercase"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Total</span></div>
      <div className="space-y-1.5">{sale.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_32px_72px] gap-1"><span>{item.productName}{showItemSku && <span className="block text-[9px] text-zinc-500">{item.productId.slice(0, 8).toUpperCase()}</span>}</span><span className="text-center">{item.quantity}</span><span className="text-right">{formatCurrency(parseFloat(item.totalPrice.toString()))}</span></div>)}</div>
      <div className="my-4 border-y-2 border-dotted border-zinc-900 py-2"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxName}</span><span>{formatCurrency(taxAmount)}</span></div>}{discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}<div className="mt-1 flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatCurrency(total)}</span></div></div>
      {showPayment && <p className="text-center">Payment: <span className="font-bold capitalize">{sale.paymentMethod}</span>{sale.mpesaRef ? ` · ${sale.mpesaRef}` : ''}</p>}
      {showQrCode && <div className="mt-4 flex justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} /></div>}
      <div className="mt-4 border-t-2 border-dotted border-zinc-900 pt-3 text-center"><p className="font-bold">{receiptFooter}</p><p className="mt-1 text-[9px] text-zinc-500">Transaction: {sale.id.slice(0, 8).toUpperCase()}</p></div>
    </div>
  }

  return (
    <div className="mx-auto w-full max-w-xl font-sans text-sm text-[#111827] print:p-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .receipt { page-break-after: avoid; }
        }
      `}</style>
      
      <div className="receipt receipt-paper overflow-hidden rounded-2xl border border-zinc-200 bg-white text-black shadow-[0_12px_32px_rgba(15,23,42,.08)] print:rounded-none print:border-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b border-zinc-200 px-6 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? <span className="flex h-11 w-28 items-center justify-center rounded-lg bg-zinc-50"><Image src={logoUrl} alt={`${businessName} logo`} width={112} height={44} unoptimized className="h-11 w-28 object-contain p-1" /></span> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e42527] text-lg font-black text-white">P</span>}
              <h1 className="text-lg font-bold tracking-tight">{businessName}</h1>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {showAddress && businessAddress && <p>{businessAddress}</p>}
              {showPhone && businessPhone && <p>{businessPhone}</p>}
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-zinc-900">Official sales receipt</p>
            <p className="mt-1 text-zinc-500">{sale.receiptNo}</p>
          </div>
        </div>

        <div className="px-6 py-6 text-center sm:px-7">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-2xl font-light text-white">✓</div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Payment successful</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-950">Thank you for your purchase</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">Your transaction is complete. Keep this receipt for your records.</p>
        </div>

        <div className="mx-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 sm:mx-7">
          <span className="text-sm text-zinc-500">Total amount</span>
          <span className="text-2xl font-bold tracking-tight text-zinc-950">{formatCurrency(total)}</span>
        </div>

        <div className="mx-6 mt-5 overflow-hidden rounded-xl border border-zinc-200 sm:mx-7">
          <div className="grid grid-cols-2">
            {[
              ['Receipt number', sale.receiptNo],
              ['Transaction date', formatDateTime(sale.createdAt)],
              ...(showCashier ? [['Cashier', cashierName]] : []),
              ...(showCustomer ? [['Customer', customerName]] : []),
              ...(showPayment ? [['Payment method', sale.paymentMethod]] : []),
              ...(sale.mpesaRef ? [['M-Pesa reference', sale.mpesaRef]] : []),
            ].map(([label, value]) => <div key={label} className="border-b border-r border-zinc-200 px-4 py-3 last:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 text-xs font-semibold capitalize text-zinc-900">{value}</p></div>)}
          </div>
        </div>

        <div className="mx-6 mt-5 rounded-xl bg-zinc-50 p-5 sm:mx-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Items purchased</p>
          <div className="space-y-2 text-xs">
            {sale.items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span className="font-medium">{item.productName} <span className="text-zinc-500">× {item.quantity}</span>{showItemSku && <span className="block text-[10px] font-normal text-zinc-500">Item {item.productId.slice(0, 8).toUpperCase()}</span>}</span><span className="font-semibold">{formatCurrency(parseFloat(item.totalPrice.toString()))}</span></div>)}
          </div>
          <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 text-xs text-zinc-600"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxName}</span><span>{formatCurrency(taxAmount)}</span></div>}{discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}<div className="mt-2 flex justify-between text-base font-bold text-zinc-950"><span>Total paid</span><span>{formatCurrency(total)}</span></div></div>
        </div>

        {showQrCode && <div className="mb-3 flex justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} /></div>}

        {/* Footer */}
        <div className="px-6 py-6 text-center text-xs text-zinc-500 sm:px-7">
          <p>{receiptFooter}</p>
          <p className="mt-2 text-[10px]">Transaction ID: {sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

      </div>
    </div>
  )
}
