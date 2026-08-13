'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Copy, Loader2, Smartphone, X } from 'lucide-react'

export function WirelessScannerPairing({ open, onClose, onBarcode }: { open: boolean; onClose: () => void; onBarcode: (barcode: string) => void }) {
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
      }
    }
    void poll()
    const timer = window.setInterval(poll, 700)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [session])

  const close = () => {
    if (session) void fetch(`/api/pos/scanner/session?sessionId=${encodeURIComponent(session.id)}`, { method: 'DELETE' })
    setSession(null); setPairUrl(''); setQrUrl(''); setConnected(false); setError('')
    onClose()
  }
  if (!open) return null
  const localOnly = pairUrl.includes('://localhost') || pairUrl.includes('://127.0.0.1')

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f9b21d] text-[#241d00]"><Smartphone className="h-5 w-5" /></span><div><h2 className="font-bold">Pair phone scanner</h2><p className="mt-0.5 text-sm text-muted-foreground">Scan on your phone; items appear on this PC.</p></div></div><button onClick={close} className="rounded-md p-2 hover:bg-muted" aria-label="Close"><X className="h-5 w-5" /></button></div>
      {error ? <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : !qrUrl ? <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#f9b21d]" /></div> : <>
        <div className="mx-auto mt-5 w-fit rounded-xl border bg-white p-3"><Image src={qrUrl} alt="Phone scanner pairing QR code" width={240} height={240} unoptimized /></div>
        <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{connected ? <><CheckCircle2 className="h-4 w-4" /> Phone connected</> : <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for phone</>}</div>
        {localOnly && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This QR uses localhost, which a phone cannot reach. Open the POS using its HTTPS network/deployed address, or configure NEXT_PUBLIC_APP_URL.</p>}
        <button type="button" onClick={() => navigator.clipboard.writeText(pairUrl)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"><Copy className="h-4 w-4" /> Copy phone link</button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Once connected this window closes automatically. The phone stays paired for up to 12 hours.</p>
      </>}
    </div>
  </div>
}
