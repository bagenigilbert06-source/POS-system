'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { createManualSale } from '@/app/actions/sales'

function methodLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function ManualSaleDialog({ paymentMethods, taxEnabled, pricesIncludeTax }: { paymentMethods: string[]; taxEnabled: boolean; pricesIncludeTax: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const close = () => dialog.current?.close()
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-4 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#050a1f] focus-visible:ring-offset-2"><Plus className="h-4 w-4" />Record sale</button>
    <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#dfe3ea] bg-white p-0 text-[#050a1f] shadow-2xl backdrop:bg-[#050a1f]/45" onClose={() => setError('')}>
      <form onSubmit={(event) => { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); startTransition(async () => { try { await createManualSale({ description: String(form.get('description')), amount: Number(form.get('amount')), paymentMethod: String(form.get('paymentMethod')) }); close() } catch (caught) { setError(caught instanceof Error ? caught.message : 'The sale could not be recorded.') } }) }}>
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f4] px-5 py-4"><div><h2 className="text-lg font-extrabold">Record a sale</h2><p className="mt-1 text-xs leading-5 text-[#667085]">For services or other sales that do not use product checkout.</p></div><button type="button" onClick={close} aria-label="Close" className="rounded-md p-2 text-[#667085] outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 px-5 py-5">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
          <label className="block text-sm font-semibold">Description<input name="description" required minLength={2} maxLength={120} placeholder="Consultation or service" className="mt-2 h-12 w-full rounded-lg border border-[#d9dde5] px-3.5 text-base outline-none focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15" /></label>
          <label className="block text-sm font-semibold">{taxEnabled && !pricesIncludeTax ? 'Amount before tax (KES)' : 'Amount (KES)'}<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" className="mt-2 h-12 w-full rounded-lg border border-[#d9dde5] px-3.5 text-base outline-none focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15" /></label>
          <label className="block text-sm font-semibold">Payment method<select name="paymentMethod" required defaultValue={paymentMethods[0] ?? ''} className="mt-2 h-12 w-full rounded-lg border border-[#d9dde5] bg-white px-3.5 text-base outline-none focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15"><option value="" disabled>Choose a method</option>{paymentMethods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}</select></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf0f4] px-5 py-4"><button type="button" onClick={close} className="min-h-11 rounded-lg border border-[#d9dde5] px-4 text-sm font-bold">Cancel</button><button type="submit" disabled={pending || !paymentMethods.length} className="min-h-11 rounded-lg bg-[#e42527] px-5 text-sm font-extrabold text-white disabled:opacity-60">{pending ? 'Recording…' : 'Record sale'}</button></div>
      </form>
    </dialog>
  </>
}
