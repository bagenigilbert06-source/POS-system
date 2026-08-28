'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Copy, ScanBarcode, X } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'

export function WirelessScannerPairing({ open, onClose, onBarcode, purpose = 'product' }: { open: boolean; onClose: () => void; onBarcode: (barcode: string) => void; purpose?: 'product' | 'customer' }) {
  const [session, setSession] = useState<{ id: string; token: string; expiresAt: string } | null>(null)
  const [pairUrl, setPairUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const handledEventsRef = useRef(new Set<string>())
  const onBarcodeRef = useRef(onBarcode)
  const onCloseRef = useRef(onClose)
  const connectionHandledRef = useRef(false)

  useEffect(() => { onBarcodeRef.current = onBarcode }, [onBarcode])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open || session) return
    let cancelled = false
    setSession(null); setPairUrl(''); setQrUrl(''); setConnected(false); setError(''); handledEventsRef.current.clear()
    connectionHandledRef.current = false
    void fetch('/api/pos/scanner/session', { method: 'POST' }).then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create scanner session')
      if (cancelled) return
      setSession(result)
      const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
      const origin = configuredOrigin || window.location.origin
      const url = `${origin}/scan/${encodeURIComponent(result.token)}`
      setPairUrl(url)
      const { default: QRCode } = await import('qrcode')
      if (!cancelled) setQrUrl(await QRCode.toDataURL(url, { width: 280, margin: 1, errorCorrectionLevel: 'M' }))
    }).catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : 'Could not create scanner session'))
    return () => { cancelled = true }
  }, [open, session])

  useEffect(() => {
    if (!session) return
    let stopped = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const response = await fetch(`/api/pos/scanner/session?sessionId=${encodeURIComponent(session.id)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Wireless scanner session expired')
        const result = await response.json() as { connected: boolean; events: Array<{ id: string; barcode: string }> }
        if (stopped) return
        setConnected(result.connected)
        if (result.connected && !connectionHandledRef.current) {
          connectionHandledRef.current = true
          // The phone is paired; hide only the QR dialog. Polling stays active so
          // its scans continue to arrive on this PC in the background.
          onCloseRef.current()
        }
        result.events.forEach((event) => {
          if (handledEventsRef.current.has(event.id)) return
          handledEventsRef.current.add(event.id)
          onBarcodeRef.current(event.barcode)
        })
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Scanner connection failed')
      } finally {
        // Schedule only after the request completes so a slow database cannot
        // build up overlapping scanner requests in development or production.
        if (!stopped) timer = window.setTimeout(poll, 2000)
      }
    }
    void poll()
    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [session])

  const close = () => {
    if (session) void fetch(`/api/pos/scanner/session?sessionId=${encodeURIComponent(session.id)}`, { method: 'DELETE' })
    setSession(null); setPairUrl(''); setQrUrl(''); setConnected(false); setError('')
    onClose()
  }
  if (!open) return null
  const localOnly = pairUrl.includes('://localhost') || pairUrl.includes('://127.0.0.1')

  const targetLabel = purpose === 'customer' ? 'customer barcode or QR code' : 'product barcode'

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="wireless-scanner-title">
    <div className="w-full max-w-[510px] overflow-hidden rounded-[7px] border border-[#d5d9df] bg-white text-[#273142] shadow-[0_8px_24px_rgba(16,24,40,.16)] dark:border-white/10 dark:bg-[#171717] dark:text-white">
      <div className="flex h-[58px] items-center justify-between border-b border-[#e4e7ec] px-5 dark:border-white/10">
        <div className="flex items-center gap-2.5"><ScanBarcode className="h-5 w-5 text-[#155eef]" /><h2 id="wireless-scanner-title" className="text-[20px] font-bold">{purpose === 'customer' ? 'Customer Barcode Scanner' : 'Product Barcode Scanner'}</h2></div>
        <button type="button" onClick={close} className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff0000] text-white transition-colors hover:bg-[#db0000]" aria-label="Close scanner"><X className="h-3 w-3" /></button>
      </div>
      <div className="px-5 py-5">
        <p className="text-center text-sm text-[#667085] dark:text-[#aeb4c0]">Scan this QR code with your phone, then scan the {targetLabel}.</p>
        {error ? <p className="mt-4 rounded-[5px] border border-red-200 bg-red-50 p-3 text-sm text-[#b42318] dark:border-red-900 dark:bg-red-950/25 dark:text-red-300">{error}</p> : !qrUrl ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#e94e16]" /></div> : <>
          <div className="mx-auto mt-4 w-fit rounded-[7px] border border-[#d5d9df] bg-white p-3"><Image src={qrUrl} alt={`${purpose === 'customer' ? 'Customer' : 'Product'} scanner connection QR code`} width={230} height={230} unoptimized /></div>
          <div className={`mx-auto mt-3 flex max-w-[278px] items-center justify-center gap-2 rounded-[5px] px-3 py-2 text-sm font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f2f4f7] text-[#667085]'}`}>{connected ? <><CheckCircle2 className="h-4 w-4" /> Scanner connected</> : <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for scanner</>}</div>
          {localOnly && <p className="mt-3 rounded-[5px] border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This QR uses localhost, which your phone cannot reach. Open the POS using its network or deployed HTTPS address, or configure NEXT_PUBLIC_APP_URL.</p>}
          <p className="mt-3 text-center text-xs text-[#667085] dark:text-[#aeb4c0]">The window closes when connected. Scans remain active for up to 12 hours.</p>
        </>}
      </div>
      <div className="flex min-h-[67px] items-center justify-end gap-2 border-t border-[#e4e7ec] px-5 py-3 dark:border-white/10">
        <button type="button" onClick={close} className="h-[38px] rounded-[5px] border border-[#092c4c] bg-[#092c4c] px-[13px] text-sm font-semibold text-white hover:bg-[#05192c]">Cancel</button>
        {qrUrl && <button type="button" onClick={() => navigator.clipboard.writeText(pairUrl)} className="inline-flex h-[38px] items-center gap-2 rounded-[5px] border border-[#e94e16] bg-[#e94e16] px-[13px] text-sm font-bold text-white hover:bg-[#cf3f0b]"><Copy className="h-4 w-4" />Copy Link</button>}
      </div>
    </div>
  </div>
}
