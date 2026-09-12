import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleItem } from '@/lib/db/schema'
import { ReceiptQrCode } from './receipt-qr-code'
import Image from 'next/image'
import { encodeThermalReceiptModel, THERMAL_RECEIPT_DATA_ATTRIBUTE } from '@/lib/printing/thermal-receipt'

interface ReceiptTemplateProps {
  sale: Pick<Sale, 'id' | 'receiptNo' | 'createdAt' | 'subtotal' | 'taxAmount' | 'discountAmount' | 'roundingAmount' | 'total' | 'paymentMethod' | 'mpesaRef'> & {
    ageVerified?: boolean
    items: Array<Pick<SaleItem, 'id' | 'productName' | 'productId' | 'quantity' | 'unitPrice' | 'totalPrice'> & { modifierNames?: string[]; lineNotes?: string }>
    cafeOrder?: { orderNumber: number; orderType?: string; tableName?: string | null; tableId?: string | null; preparationStatus?: string } | null
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
    shippingAmount?: number | string
    couponAmount?: number | string
    couponCode?: string | null
    bonusRedeemed?: number | string
    feedbackUrl?: string | null
  }
  businessName?: string
  businessPhone?: string
  businessAddress?: string
  kraPin?: string
  receiptFooter?: string
  cashierName?: string
  terminalName?: string
  customerName?: string
  taxName?: string
  taxIncluded?: boolean
  showTaxOnReceipt?: boolean
  branchName?: string | null
  showPhone?: boolean
  showAddress?: boolean
  showCashier?: boolean
  showCustomer?: boolean
  showPayment?: boolean
  showQrCode?: boolean
  showItemSku?: boolean
  showShipping?: boolean
  showCoupon?: boolean
  showBonus?: boolean
  layout?: 'detailed' | 'thermal'
  template?: 'classic' | 'logo' | 'cafe'
  logoUrl?: string
}

export function ReceiptTemplate({
  sale,
  businessName = 'Business',
  businessPhone = '',
  businessAddress = '',
  kraPin = '',
  receiptFooter = 'Thank you for your business!',
  cashierName = 'Cashier',
  terminalName = '',
  customerName = 'Customer',
  taxName = 'Tax',
  taxIncluded = false,
  showTaxOnReceipt = false,
  branchName = '',
  showPhone = true,
  showAddress = true,
  showCashier = true,
  showCustomer = true,
  showPayment = true,
  showItemSku = false,
  showShipping = true,
  showCoupon = true,
  showBonus = true,
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
  const shippingAmount = Number(sale.shippingAmount ?? 0)
  const couponAmount = Number(sale.couponAmount ?? 0)
  const bonusRedeemed = Number(sale.bonusRedeemed ?? 0)
  const taxPresentationLabel = taxIncluded ? `${taxName} included` : taxName
  const subtotalPresentationLabel = taxIncluded ? 'Total before VAT' : 'Subtotal'
  const subtotalPresentationAmount = taxIncluded ? total - taxAmount : subtotal
  const cafe = template === 'cafe'
  const logo = template === 'logo'
  const paymentLabel = sale.mpesaDetails?.mode === 'till'
    ? 'M-Pesa Till'
    : sale.mpesaDetails?.mode === 'paybill'
      ? 'M-Pesa PayBill'
      : sale.paymentMethod.replaceAll('_', ' ')
  const itemCount = sale.items.reduce((count, item) => count + item.quantity, 0)

  // Keep the semantic data used by native thermal printing beside the UI
  // receipt. The browser layout remains the source of truth for browser/PDF
  // output, while QZ/raw TCP can render deterministic ESC/POS columns.
  const thermalReceiptData = encodeThermalReceiptModel({
    version: 1,
    businessName,
    kraPin: kraPin || undefined,
    logoUrl: logoUrl || undefined,
    contactLines: [branchName, showAddress ? businessAddress : '', showPhone && businessPhone ? `Tel: ${businessPhone}` : '', kraPin ? `KRA PIN: ${kraPin}` : ''].filter((line): line is string => Boolean(line)),
    title: isProvisional ? 'Provisional receipt' : 'Sales receipt',
    metadata: [formatDateTime(sale.createdAt), `Receipt: ${sale.receiptNo}`, ...(sale.cafeOrder ? [`Order: #${sale.cafeOrder.orderNumber}`] : []), ...(sale.cafeOrder?.orderType ? [`Order type: ${sale.cafeOrder.orderType.replace('_', '-')}`] : []), ...(sale.cafeOrder?.tableName ? [`Table: ${sale.cafeOrder.tableName}`] : []), ...(showCashier ? [`Cashier: ${cashierName}`] : []), ...(terminalName ? [`Terminal: ${terminalName}`] : []), ...(showCustomer ? [`Customer: ${customerName}`] : [])],
    items: sale.items.map((item) => ({
      description: item.productName,
      quantity: String(item.quantity),
      unitPrice: formatCurrency(parseFloat(item.unitPrice.toString())),
      amount: formatCurrency(parseFloat(item.totalPrice.toString())),
      details: [...(item.modifierNames?.map((name) => `+ ${name}`) ?? []), ...(item.lineNotes ? [`Note: ${item.lineNotes}`] : []), ...(showItemSku ? [`SKU: ${item.productId.slice(0, 8).toUpperCase()}`] : [])],
    })),
    totals: [
      { label: subtotalPresentationLabel, amount: formatCurrency(subtotalPresentationAmount) },
      ...(showTaxOnReceipt && taxAmount > 0 ? [{ label: taxPresentationLabel, amount: formatCurrency(taxAmount) }] : []),
      ...(showShipping && shippingAmount > 0 ? [{ label: 'Shipping', amount: formatCurrency(shippingAmount) }] : []),
      ...(showCoupon && couponAmount > 0 ? [{ label: `Coupon${sale.couponCode ? ` (${sale.couponCode})` : ''}`, amount: `-${formatCurrency(couponAmount)}` }] : []),
      ...(discountAmount > 0 ? [{ label: 'Discount', amount: `-${formatCurrency(Math.max(0, discountAmount - couponAmount))}` }] : []),
      ...(showBonus && bonusRedeemed > 0 ? [{ label: 'Bonus redeemed', amount: `-${formatCurrency(bonusRedeemed)}` }] : []),
      ...(roundingAmount !== 0 ? [{ label: 'Rounding', amount: `${roundingAmount > 0 ? '+' : '-'}${formatCurrency(Math.abs(roundingAmount))}` }] : []),
    ],
    total: { label: 'TOTAL', amount: formatCurrency(total) },
    itemCountLabel: `${itemCount} ${itemCount === 1 ? 'item' : 'items'} sold`,
    paymentLines: showPayment ? [sale.paymentMethod === 'mpesa' ? 'Payment: M-Pesa' : `Paid by: ${paymentLabel}`, `Amount paid: ${formatCurrency(total)}`, ...(sale.mpesaDetails?.merchant && sale.mpesaDetails.mode === 'till' ? [`Till: ${sale.mpesaDetails.merchant}`] : []), ...(sale.mpesaRef ? [`M-Pesa Ref: ${sale.mpesaRef}`] : []), ...(sale.mpesaDetails?.merchant && sale.mpesaDetails.mode === 'paybill' ? [`PayBill: ${sale.mpesaDetails.merchant}`] : []), ...(sale.mpesaDetails?.accountReference ? [`Account: ${sale.mpesaDetails.accountReference}`] : [])] : [],
    notices: isProvisional ? ['OFFLINE - SYNC PENDING', 'NOT AN OFFICIAL OR FISCAL RECEIPT'] : [],
    qrCodes: [
      ...(sale.feedbackUrl ? [{ value: sale.feedbackUrl, label: 'Scan to rate your experience' }] : []),
      ...(sale.etims?.qrData ? [{ value: sale.etims.qrData, label: 'eTIMS verification' }] : []),
    ],
    footer: receiptFooter,
    transactionId: sale.id.slice(0, 8).toUpperCase(),
  })

  if (layout === 'thermal') {
    return <div style={{ fontFamily: 'Manrope, Inter, Arial, sans-serif' }} className="receipt-paper receipt-thermal receipt-java-style mx-auto w-full max-w-full bg-white px-[3mm] py-[3mm] text-[9pt] font-medium leading-[1.35] text-black print:w-full print:max-w-none print:px-[2mm] print:py-[2mm]" {...{ [THERMAL_RECEIPT_DATA_ATTRIBUTE]: thermalReceiptData }}>
      <div className="text-center">{logoUrl ? <span className="mb-2 flex h-[18mm] items-center justify-center"><Image src={logoUrl} alt={`${businessName} logo`} width={220} height={144} unoptimized className="max-h-[18mm] w-auto max-w-[28mm] object-contain grayscale" /></span> : null}<h1 className="whitespace-pre-wrap text-[15pt] font-extrabold uppercase leading-tight tracking-tight">{businessName}</h1>{branchName && <p className="text-[8.5pt]">{branchName}</p>}{showAddress && businessAddress && <p className="whitespace-pre-line text-[8.5pt]">{businessAddress}</p>}{showPhone && businessPhone && <p className="text-[8.5pt]">Tel: {businessPhone}</p>}{kraPin && <p className="text-[8.5pt]">KRA PIN: {kraPin}</p>}{cafe && <p className="mt-1 text-[8.5pt]">Store #{sale.id.slice(0, 5).toUpperCase()} - {formatDateTime(sale.createdAt)}</p>}</div>
      <div className="my-[3mm] border-y border-dashed border-black py-[2mm] text-center text-[8.5pt]"><p className="text-[11pt] font-extrabold tracking-wide">{isProvisional ? 'PROVISIONAL RECEIPT' : 'SALES RECEIPT'}</p>{sale.cafeOrder && <p className="text-[10pt] font-bold">ORDER #{sale.cafeOrder.orderNumber}</p>}<p>{formatDateTime(sale.createdAt)}</p><p>Receipt: {sale.receiptNo}</p>{sale.cafeOrder?.orderType && <p>Order type: {sale.cafeOrder.orderType.replace('_', '-')}</p>}{sale.cafeOrder?.tableName && <p>Table: {sale.cafeOrder.tableName}</p>}{showCashier && <p>Cashier: {cashierName}</p>}{showCustomer && <p>Customer: {customerName}</p>}{isProvisional && <><p className="mt-2 border-y border-black py-1 font-bold">OFFLINE - SYNC PENDING</p><p className="mt-1 text-[8.5pt] font-bold leading-3">NOT AN OFFICIAL OR FISCAL RECEIPT</p></>}</div>
      <div>{sale.items.map((item) => <div key={item.id} className="break-inside-avoid border-b border-dotted border-zinc-500 py-1.5 text-[9pt]"><p className="break-words font-semibold leading-tight">{item.productName}</p>{item.modifierNames?.map((name) => <p key={name} className="pl-2 text-[8.5pt]">+ {name}</p>)}{item.lineNotes && <p className="pl-2 text-[8.5pt]">Note: {item.lineNotes}</p>}{showItemSku && <p className="text-[8pt]">SKU: {item.productId.slice(0, 8).toUpperCase()}</p>}<div className="mt-0.5 flex items-baseline justify-between gap-2 text-[8.5pt] tabular-nums"><span className="whitespace-nowrap">{item.quantity} x {formatCurrency(parseFloat(item.unitPrice.toString()))}</span><span className="whitespace-nowrap text-right font-semibold">{formatCurrency(parseFloat(item.totalPrice.toString()))}</span></div></div>)}</div>
      <div className="my-[3mm] border-y border-dashed border-black py-[2mm] tabular-nums"><div className="flex justify-between"><span>{subtotalPresentationLabel}</span><span>{formatCurrency(subtotalPresentationAmount)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxPresentationLabel}</span><span>{formatCurrency(taxAmount)}</span></div>}{showShipping && shippingAmount > 0 && <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(shippingAmount)}</span></div>}{showCoupon && couponAmount > 0 && <div className="flex justify-between"><span>Coupon{sale.couponCode ? ` (${sale.couponCode})` : ''}</span><span>-{formatCurrency(couponAmount)}</span></div>}{discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(Math.max(0, discountAmount - couponAmount))}</span></div>}{showBonus && bonusRedeemed > 0 && <div className="flex justify-between"><span>Bonus redeemed</span><span>-{formatCurrency(bonusRedeemed)}</span></div>}{roundingAmount !== 0 && <div className="flex justify-between"><span>Rounding</span><span>{roundingAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(roundingAmount))}</span></div>}<div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 text-[13px] font-bold"><span>TOTAL</span><span>{formatCurrency(total)}</span></div></div>
      <div className="text-center text-[9px] font-bold uppercase tracking-wide">{itemCount} {itemCount === 1 ? 'item' : 'items'} sold</div>
      {showPayment && <div className="mt-[3mm] border-y border-dashed border-black py-[2mm] text-center"><p>{sale.paymentMethod === 'mpesa' ? 'Payment: M-Pesa' : <>Paid by: <span className="font-bold capitalize">{paymentLabel}</span></>}</p><p className="font-bold">Amount paid: {formatCurrency(total)}</p>{sale.mpesaDetails?.merchant && sale.mpesaDetails.mode === 'till' && <p>Till: {sale.mpesaDetails.merchant}</p>}{sale.mpesaRef && <p>M-Pesa Ref: {sale.mpesaRef}</p>}{sale.mpesaDetails?.merchant && sale.mpesaDetails.mode === 'paybill' && <p>PayBill: {sale.mpesaDetails.merchant}</p>}{sale.mpesaDetails?.accountReference && <p>Account: {sale.mpesaDetails.accountReference}</p>}{terminalName && <p>Terminal: {terminalName}</p>}</div>}
      {sale.ageVerified && <p className="mt-2 text-center text-[9px] font-bold">Age verification: Confirmed</p>}
      {sale.feedbackUrl && <div className="mt-4 border-y border-dotted border-zinc-700 py-3 text-center"><p className="font-bold">HOW DID WE DO?</p><div className="mt-2 flex justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total="" paymentMethod="" createdAt={sale.createdAt} value={sale.feedbackUrl} label="Scan to rate your experience" size={108} /></div><p className="mt-1 text-[9px]">Scan to rate your experience</p></div>}
      {sale.etims && sale.etims.status !== 'NOT_REQUIRED' && <div className="mt-4 border-y border-dotted border-zinc-700 py-2 text-[9px]"><p className="font-bold">eTIMS: {sale.etims.status === 'ACCEPTED' ? 'ACCEPTED' : sale.etims.status === 'FAILED' ? 'ACTION REQUIRED' : 'PENDING SUBMISSION'}</p>{sale.etims.status === 'ACCEPTED' && <>{sale.etims.invoiceNumber && <p>Invoice: {sale.etims.invoiceNumber}</p>}{sale.etims.controlNumber && <p>Control: {sale.etims.controlNumber}</p>}{sale.etims.receiptNumber && <p>Fiscal receipt: {sale.etims.receiptNumber}</p>}{sale.etims.verificationData && <p className="break-all">Verify: {sale.etims.verificationData}</p>}{sale.etims.qrData && <div className="mt-2 flex flex-col items-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} value={sale.etims.qrData} label="eTIMS verification QR code" /><p className="mt-1">eTIMS verification</p></div>}{sale.etims.environment === 'sandbox' && <p className="font-bold">SANDBOX / NOT A PRODUCTION TAX INVOICE</p>}</>}</div>}
      <div className="mt-[3mm] border-t border-dashed border-black pt-[3mm] text-center"><p className="font-bold">{receiptFooter}</p><p className="mt-1.5 text-[8px] leading-3">Transaction: {sale.id.slice(0, 8).toUpperCase()}</p></div>
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
      
      <div className="receipt receipt-paper overflow-hidden rounded-2xl border border-zinc-200 bg-white text-black shadow-[0_12px_32px_rgba(15,23,42,.08)] print:rounded-none print:border-0 print:shadow-none" {...{ [THERMAL_RECEIPT_DATA_ATTRIBUTE]: thermalReceiptData }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b border-zinc-200 px-6 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? <span className="flex h-11 w-28 items-center justify-center rounded-lg bg-zinc-50"><Image src={logoUrl} alt={`${businessName} logo`} width={112} height={44} unoptimized className="h-11 w-28 object-contain p-1" /></span> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e42527] text-lg font-black text-white">P</span>}
              <h1 className="whitespace-pre-wrap text-lg font-bold tracking-tight">{businessName}</h1>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {branchName && <p>{branchName}</p>}{showAddress && businessAddress && <p>{businessAddress}</p>}
              {showPhone && businessPhone && <p>{businessPhone}</p>}
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-zinc-900">{isProvisional ? 'Provisional offline receipt' : 'Official sales receipt'}</p>
            <p className="mt-1 text-zinc-500">{sale.receiptNo}</p>
          </div>
        </div>

        {isProvisional && <div className="mx-6 mt-5 border-2 border-zinc-900 px-4 py-3 text-center sm:mx-7"><p className="text-sm font-black uppercase tracking-[0.12em]">Offline Â· synchronization pending</p><p className="mt-1 text-xs font-semibold">Not an official or fiscal receipt. Keep this copy until an official receipt is issued.</p></div>}

        <div className="px-6 py-6 text-center sm:px-7">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-2xl font-light text-white">âœ“</div>
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
              ...(sale.ageVerified ? [['Age verification', 'Completed']] : []),
            ].map(([label, value]) => <div key={label} className="border-b border-r border-zinc-200 px-4 py-3 last:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 text-xs font-semibold capitalize text-zinc-900">{value}</p></div>)}
          </div>
        </div>

        <div className="mx-6 mt-5 rounded-xl bg-zinc-50 p-5 sm:mx-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Items purchased</p>
          <div className="space-y-2 text-xs">
            {sale.items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span className="font-medium">{item.productName} <span className="text-zinc-500">Ã— {item.quantity}</span>{showItemSku && <span className="block text-[10px] font-normal text-zinc-500">Item {item.productId.slice(0, 8).toUpperCase()}</span>}</span><span className="font-semibold">{formatCurrency(parseFloat(item.totalPrice.toString()))}</span></div>)}
          </div>
          <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 text-xs text-zinc-600"><div className="flex justify-between"><span>{subtotalPresentationLabel}</span><span>{formatCurrency(subtotalPresentationAmount)}</span></div>{taxAmount > 0 && <div className="flex justify-between"><span>{taxPresentationLabel}</span><span>{formatCurrency(taxAmount)}</span></div>}{showShipping && shippingAmount > 0 && <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(shippingAmount)}</span></div>}{showCoupon && couponAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon{sale.couponCode ? ` (${sale.couponCode})` : ''}</span><span>-{formatCurrency(couponAmount)}</span></div>}{discountAmount - couponAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{formatCurrency(Math.max(0, discountAmount - couponAmount))}</span></div>}{showBonus && bonusRedeemed > 0 && <div className="flex justify-between text-emerald-700"><span>Bonus redeemed</span><span>-{formatCurrency(bonusRedeemed)}</span></div>}{roundingAmount !== 0 && <div className="flex justify-between"><span>M-Pesa rounding</span><span>{roundingAmount > 0 ? '+' : '-'}{formatCurrency(Math.abs(roundingAmount))}</span></div>}<div className="mt-2 flex justify-between text-base font-bold text-zinc-950"><span>Total paid</span><span>{formatCurrency(total)}</span></div></div>
        </div>

        {sale.feedbackUrl && <div className="mx-6 mt-5 rounded-xl border border-zinc-200 p-4 text-center sm:mx-7"><p className="text-xs font-bold">HOW DID WE DO?</p><div className="mt-2 flex justify-center"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total="" paymentMethod="" createdAt={sale.createdAt} value={sale.feedbackUrl} label="Scan to rate your experience" /></div><p className="mt-1 text-xs text-zinc-500">Scan to rate your experience</p></div>}

        {sale.etims && sale.etims.status !== 'NOT_REQUIRED' && <div className="mx-6 mt-5 rounded-xl border border-zinc-200 p-4 text-xs sm:mx-7"><p className="font-bold">eTIMS: {sale.etims.status === 'ACCEPTED' ? 'Accepted' : sale.etims.status === 'FAILED' ? 'Action required' : 'Pending submission'}</p>{sale.etims.status === 'ACCEPTED' && <div className="mt-2 space-y-1 text-zinc-600">{sale.etims.invoiceNumber && <p>Invoice: {sale.etims.invoiceNumber}</p>}{sale.etims.controlNumber && <p>Control number: {sale.etims.controlNumber}</p>}{sale.etims.receiptNumber && <p>Fiscal receipt: {sale.etims.receiptNumber}</p>}{sale.etims.verificationData && <p className="break-all">Verification: {sale.etims.verificationData}</p>}{sale.etims.qrData && <div className="flex flex-col items-center pt-2"><ReceiptQrCode saleId={sale.id} receiptNo={sale.receiptNo} total={formatCurrency(total)} paymentMethod={sale.paymentMethod} createdAt={sale.createdAt} value={sale.etims.qrData} label="eTIMS verification QR code" /><p className="mt-1 text-[10px]">eTIMS verification</p></div>}{sale.etims.environment === 'sandbox' && <p className="font-bold text-zinc-900">Sandbox response â€” not a production tax invoice</p>}</div>}</div>}

        {/* Footer */}
        <div className="px-6 py-6 text-center text-xs text-zinc-500 sm:px-7">
          <p>{receiptFooter}</p>
          <p className="mt-2 text-[10px]">Transaction ID: {sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

      </div>
    </div>
  )
}
