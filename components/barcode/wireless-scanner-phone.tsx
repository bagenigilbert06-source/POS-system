'use client'

import { useEffect, useState } from 'react'
import { Barcode, CheckCircle2, ScanLine } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { BarcodeScannerDialog } from './barcode-scanner-dialog'

export function WirelessScannerPhone({ token }: { token: string }) {
  const [active, setActive] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const heartbeat = () => fetch(`/api/pos/scanner/scan?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((response) => { setActive(response.ok); if (!response.ok) setError('This pairing link expired. Create a new pairing from the POS computer.') })
      .catch(() => { setActive(false); setError('Could not connect to the POS computer.') })
    void heartbeat()
    const timer = window.setInterval(() => void heartbeat(), 5_000)
    return () => window.clearInterval(timer)
  }, [token])

  const send = async (barcode: string) => {
    setScanning(false); setSending(true); setError(''); setMessage(''); setNeedsRegistration(false)
    try {
      const response = await fetch('/api/pos/scanner/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, barcode, clientEventId: crypto.randomUUID() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Scan was not accepted')
      setNeedsRegistration(result.registered === false)
      setMessage(result.registered === false
        ? `New barcode ${result.barcode} sent to the POS. Complete the product registration on the computer.`
        : `${result.product.name} sent to POS`)
      if (navigator.vibrate) navigator.vibrate(80)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send scan') }
    finally { setSending(false) }
  }

  return <main className="min-h-screen bg-[#f7f8fa] p-4 text-[#101828] dark:bg-[#0c0c0c] dark:text-white"><div className="mx-auto max-w-md pt-8">
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161616]"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f9b21d] text-[#241d00]"><Barcode className="h-6 w-6" /></span><div><h1 className="text-lg font-bold">Pesaby phone scanner</h1><p className="text-sm text-muted-foreground">Paired with your POS computer</p></div></div>
      {active === null ? <div className="my-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#f9b21d]" /><p className="mt-2 text-sm">Connecting…</p></div> : active ? <div className="mt-8"><button disabled={sending} onClick={() => setScanning(true)} className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-[#f9b21d] text-base font-bold text-[#241d00] disabled:opacity-60">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}{sending ? 'Sending to POS…' : 'Scan an item'}</button><p className="mt-3 text-center text-xs text-muted-foreground">After each scan, confirm the item was sent and scan the next one.</p></div> : null}
      {message && <p className={`mt-5 flex items-start gap-2 rounded-lg p-3 text-sm font-semibold ${needsRegistration ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-700'}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
      {error && <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    </div>
    <BarcodeScannerDialog open={scanning} onClose={() => setScanning(false)} onScan={send} title="Scan item for POS" />
  </div></main>
}
