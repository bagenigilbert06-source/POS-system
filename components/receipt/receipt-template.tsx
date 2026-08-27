import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleItem } from '@/lib/db/schema'
import { ReceiptQrCode } from './receipt-qr-code'
import Image from 'next/image'

interface ReceiptTemplateProps {
  sale: Pick<Sale, 'id' | 'receiptNo' | 'createdAt' | 'subtotal' | 'taxAmount' | 'discountAmount' | 'roundingAmount' | 'total' | 'paymentMethod' | 'mpesaRef'> & {
    items: Array<Pick<SaleItem, 'id' | 'productName' | 'productId' | 'quantity' | 'totalPrice'>>
    etims?: {
      status: string
      environment?: string
      invoiceNumber?: string | null
      controlNumber?: string | null
      receiptNumber?: string | null
      internalReference?: string | null
      qrData?: string | null
      verificationData?: string | null
    } | null
    offline?: {
      status: 'PENDING' | 'SYNCED'
      provisionalReceiptNo: string
    } | null
    mpesaDetails?: { mode?: 'stk' | 'till' | 'paybill'; phone?: string; merchant?: string; accountReference?: string | null } | null
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
  const roundingAmount = parseFloat(sale.roundingAmount.toString())
  const total = parseFloat(sale.total.toString())
  const isProvisional = sale.offline?.status === 'PENDING'

  if (layout === 'thermal') {
    const cafe = template === 'cafe'
    const logo = template === 'logo'
    return <div className="receipt-paper mx-auto w-[80mm] max-w-full bg-white px-[4mm] py-[6mm] font-mono text-[11px] leading-5 text-zinc-900 print:w-full print:max-w-none print:px-[3mm] print:py-[5mm]">
      <div className="text-center">{logo && (logoUrl ? <span className="mb-2 flex h-14 items-center justify-center"><Image src={logoUrl} alt={`${businessName} logo`} width={180} height={56} unoptimized className="h-14 w-auto max-w-[180px] object-contain" /></span> : <div className="mb-2 text-2xl font-black tracking-[0.22em]">LOGO</div>)}<h1 className={`text-sm font-bold uppercase tracking-wide ${cafe ? 'text-base' : ''}`}>{businessName}</h1>{showAddress && businessAddress && <p>{businessAddress}</p>}{showPhone && businessPhone && <p>{businessPhone}</p>}{cafe && <p className="mt-2">Store #{sale.id.slice(0, 5).toUpperCase()} · {formatDateTime(sale.createdAt)}</p>}</div>
      <div className="my-4 border-y-2 border-dotted border-zinc-700 py-2 text-center"><p className="font-bold tracking-wide">{isProvisional ? 'PROVISIONAL RECEIPT' : 'RECEIPT'}</p><p>{formatDateTime(sale.createdAt)}</p><p>#{sale.receiptNo}</p>{isProvisional && <><p className="mt-2 border-y border-zinc-900 py-1 font-black">OFFLINE · SYNC PENDING</p><p className="mt-1 text-[9px] font-bold leading-3">NOT AN OFFICIAL OR FISCAL RECEIPT</p></>}</div>
      <div className="mb-3 grid grid-cols-[1fr_32px_72px] gap-1 border-b border-dotted border-zinc-700 pb-1 text-[10px] font-bold uppercase"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Total</span></div>
      <div className="space-y-2">{sale.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_32px_72px] gap-1"><span>{item.productName}{showItemSku && <span className="mt-0.5 block text-[8px] font-normal leading-3 tracking-wide text-zinc-400">{item.productId.slice(0, 8).toUpperCase()}</span>}</span><span className="text-center">{item.quantity}</span><span className="text-right">{formatCurrency(parseFloat(item.totalPrice.toString()))}</span></div>)}</div>
      <div className="my-4 border-y-2 border-dotted border-zinc-700 py-2"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxName}</span><span>{formatCurrency(taxAmount)}</span></div>}{discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}{roundingAmount !== 0 && <div className="flex justify-between"><span>M-Pesa rounding</span><span>{roundingAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(roundingAmount))}</span></div>}<div className="mt-1 flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatCurrency(total)}</span></div></div>
      {showPayment && <div className="mt-5 text-center"><p>Payment: <span className="font-bold">{sale.mpesaDetails?.mode === 'till' ? 'M-Pesa — Till' : sale.mpesaDetails?.mode === 'paybill' ? 'M-Pesa — PayBill' : sale.paymentMethod}</span> {formatCurrency(total)}</p>{sale.mpesaRef && <p>Receipt: {sale.mpesaRef}</p>}{sale.mpesaDetails?.merchant && sale.mpesaDetails.mode !== 'stk' && <p>{sale.mpesaDetails.mode === 'till' ? 'Till' : 'PayBill'}: {sale.mpesaDetails.merchant}</p>}{sale.mpesaDetails?.accountReference && <p>Account: {sale.mpesaDetails.accountReference}</p>}{sale.mpesaDetails?.phone && <p>Phone: {sale.mpesaDetails.phone}</p>}</div>}
      {sale.etims && sale.etims.status !== 'NOT_REQUIRED' && <div className="mt-4 border-y border-dotted border-zinc-700 py-2 text-[9px]"><p className="font-bold">eTIMS: {sale.etims.status === 'ACCEPTED' ? 'ACCEPTED' : sale.etims.status === 'FAILED' ? 'ACTION REQUIRED' : 'PENDING SUBMISSION'}</p>{sale.etims.status === 'ACCEPTED' && <>{sale.etims.invoiceNumber && <p>Invoice: {sale.etims.invoiceNumber}</p>}{sale.etims.controlNumber && <p>Control: {sale.etims.controlNumber}</p>}{sale.etims.receiptNumber && <p>Fiscal receipt: {sale.etims.receiptNumber}</p>}{sale.etims.verificationData && <p className="break-all">Verify: {sale.etims.verificationData}</p>}{sale.etims.qrData && <div className="mt-2 flex flex-col items-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} value={sale.etims.qrData} label="eTIMS verification QR code" /><p className="mt-1">eTIMS verification</p></div>}{sale.etims.environment === 'sandbox' && <p className="font-bold">SANDBOX / NOT A PRODUCTION TAX INVOICE</p>}</>}</div>}
      {showQrCode && !isProvisional && <div className="mt-5 flex flex-col items-center justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} /><p className="mt-2 text-[8px] leading-3 text-zinc-400">Scan for receipt details</p></div>}
      <div className="mt-5 border-t-2 border-dotted border-zinc-700 pt-4 text-center"><p className="font-bold">{receiptFooter}</p><p className="mt-1.5 text-[8px] leading-3 text-zinc-400">Transaction: {sale.id.slice(0, 8).toUpperCase()}</p></div>
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
            <p className="font-bold text-zinc-900">{isProvisional ? 'Provisional offline receipt' : 'Official sales receipt'}</p>
            <p className="mt-1 text-zinc-500">{sale.receiptNo}</p>
          </div>
        </div>

        {isProvisional && <div className="mx-6 mt-5 border-2 border-zinc-900 px-4 py-3 text-center sm:mx-7"><p className="text-sm font-black uppercase tracking-[0.12em]">Offline · synchronization pending</p><p className="mt-1 text-xs font-semibold">Not an official or fiscal receipt. Keep this copy until an official receipt is issued.</p></div>}

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
          <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 text-xs text-zinc-600"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxName}</span><span>{formatCurrency(taxAmount)}</span></div>}{discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}{roundingAmount !== 0 && <div className="flex justify-between"><span>M-Pesa rounding</span><span>{roundingAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(roundingAmount))}</span></div>}<div className="mt-2 flex justify-between text-base font-bold text-zinc-950"><span>Total paid</span><span>{formatCurrency(total)}</span></div></div>
        </div>

        {showQrCode && !isProvisional && <div className="mb-3 flex justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} /></div>}

        {sale.etims && sale.etims.status !== 'NOT_REQUIRED' && <div className="mx-6 mt-5 rounded-xl border border-zinc-200 p-4 text-xs sm:mx-7"><p className="font-bold">eTIMS: {sale.etims.status === 'ACCEPTED' ? 'Accepted' : sale.etims.status === 'FAILED' ? 'Action required' : 'Pending submission'}</p>{sale.etims.status === 'ACCEPTED' && <div className="mt-2 space-y-1 text-zinc-600">{sale.etims.invoiceNumber && <p>Invoice: {sale.etims.invoiceNumber}</p>}{sale.etims.controlNumber && <p>Control number: {sale.etims.controlNumber}</p>}{sale.etims.receiptNumber && <p>Fiscal receipt: {sale.etims.receiptNumber}</p>}{sale.etims.verificationData && <p className="break-all">Verification: {sale.etims.verificationData}</p>}{sale.etims.qrData && <div className="flex flex-col items-center pt-2"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} value={sale.etims.qrData} label="eTIMS verification QR code" /><p className="mt-1 text-[10px]">eTIMS verification</p></div>}{sale.etims.environment === 'sandbox' && <p className="font-bold text-zinc-900">Sandbox response — not a production tax invoice</p>}</div>}</div>}

        {/* Footer */}
        <div className="px-6 py-6 text-center text-xs text-zinc-500 sm:px-7">
          <p>{receiptFooter}</p>
          <p className="mt-2 text-[10px]">Transaction ID: {sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

      </div>
    </div>
  )
}
