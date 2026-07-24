import { CheckCircle2, ReceiptText } from 'lucide-react'

type ReceiptPreviewProps = {
  businessName: string
  phone: string
  address: string
  header?: string
  footer: string
  taxEnabled: boolean
  taxName: string
  taxRate: string
  showTax: boolean
  paymentMethod: string
  showPhone: boolean
  showAddress: boolean
  showCashier: boolean
  showCustomer: boolean
  showPayment: boolean
  showQrCode: boolean
  showItemSku: boolean
}

function paymentLabel(paymentMethod: string) {
  return paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/** A compact, printer-first receipt preview shared by onboarding and settings. */
export function ReceiptPreview({ businessName, phone, address, header, footer, taxEnabled, taxName, taxRate, showTax, paymentMethod, showPhone, showAddress, showCashier, showCustomer, showPayment, showQrCode, showItemSku }: ReceiptPreviewProps) {
  const subtotal = 2200
  const tax = taxEnabled ? Math.round((subtotal * Number(taxRate || 0)) / 100) : 0
  const total = subtotal + tax

  return <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-3 shadow-inner sm:p-5">
    <div className="mx-auto max-w-[292px] bg-white px-5 py-6 font-mono text-[11px] leading-5 text-zinc-800 shadow-[0_10px_24px_rgba(15,23,42,.16)]">
      <div className="text-center">
        <ReceiptText className="mx-auto mb-2 h-5 w-5 text-[#e42527]" />
        {header && <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{header}</p>}
        <p className="text-sm font-extrabold tracking-tight text-zinc-950">{businessName || 'Your business'}</p>
        {showAddress && address && <p className="mt-1 whitespace-pre-line text-zinc-600">{address}</p>}
        {showPhone && phone && <p className="text-zinc-600">{phone}</p>}
      </div>

      <div className="my-4 border-t border-dashed border-zinc-400" />
      <div className="flex justify-between"><span>Receipt</span><span className="font-bold">REC-000124</span></div>
      <div className="flex justify-between text-zinc-600"><span>24 Jul 2026, 10:42</span><span>Counter 1</span></div>
      {(showCashier || showCustomer) && <div className="mt-1 text-zinc-600">{showCashier && <p>Served by: Alex</p>}{showCustomer && <p>Customer: Walk-in</p>}</div>}
      <div className="my-4 border-t border-dashed border-zinc-400" />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3"><span>Everyday Essentials{showItemSku && <small className="block text-zinc-500">SKU: PES-001</small>}</span><span className="shrink-0">1,500.00</span></div>
        <div className="flex items-start justify-between gap-3"><span>Fresh produce{showItemSku && <small className="block text-zinc-500">SKU: PES-002</small>}</span><span className="shrink-0">700.00</span></div>
      </div>
      <div className="my-4 border-t border-dashed border-zinc-400" />
      <div className="space-y-1 text-zinc-700">
        <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
        {taxEnabled && showTax && <div className="flex justify-between"><span>{taxName || 'Tax'} ({taxRate || '0'}%)</span><span>KES {tax.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>}
        <div className="mt-2 flex justify-between border-t border-zinc-950 pt-2 text-sm font-extrabold text-zinc-950"><span>TOTAL</span><span>KES {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
      </div>
      {showPayment && <><div className="my-4 border-t border-dashed border-zinc-400" /><div className="flex justify-between"><span>Paid via</span><span className="font-bold">{paymentLabel(paymentMethod)}</span></div></>}
      {showQrCode && <div className="mx-auto mt-4 grid h-16 w-16 grid-cols-7 gap-px bg-white p-1">{Array.from({ length: 49 }, (_, index) => <span key={index} className={(index * 11 + index % 5) % 7 < 3 ? 'bg-zinc-950' : 'bg-white'} />)}</div>}
      <div className="mt-4 text-center text-zinc-600"><CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-600" /><p>{footer || 'Thank you for your business.'}</p><p className="mt-2 text-[9px] text-zinc-400">Keep this receipt for your records</p></div>
    </div>
  </div>
}
