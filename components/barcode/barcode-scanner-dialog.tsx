'use client'

import { useEffect, useRef, useState } from 'react'
import { Barcode, Camera, Loader2, X } from 'lucide-react'
import { normalizeBarcode } from '@/lib/utils'

interface BarcodeScannerDialogProps {
  open: boolean
  onClose: () => void
  onScan: (barcode: string) => void | Promise<void>
  title?: string
}

export function BarcodeScannerDialog({ open, onClose, onScan, title = 'Scan barcode' }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanHandledRef = useRef(false)
  const onScanRef = useRef(onScan)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')
  const [error, setError] = useState('')

  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!open) return
    let disposed = false
    let controls: { stop: () => void } | undefined
    const videoElement = videoRef.current
    scanHandledRef.current = false
    setStatus('starting')
    setError('')

    const start = async () => {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setStatus('error')
        setError('Phone camera access requires HTTPS. Open the secure site URL and try again.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setError('This browser cannot access the camera. Try current Chrome or Safari.')
        return
      }

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        if (disposed || !videoElement) return
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.QR_CODE,
        ])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 800 })
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoElement,
          (result) => {
            if (!result || scanHandledRef.current) return
            const barcode = normalizeBarcode(result.getText())
            if (!barcode) return
            scanHandledRef.current = true
            controls?.stop()
            void onScanRef.current(barcode)
          },
        )
        if (!disposed) setStatus('ready')
      } catch (cause) {
        if (disposed) return
        setStatus('error')
        const message = cause instanceof Error ? cause.message : ''
        setError(message.toLowerCase().includes('permission') || message.toLowerCase().includes('notallowed')
          ? 'Camera permission was denied. Allow camera access in your browser and try again.'
          : 'Could not start the camera. Check permission and make sure another app is not using it.')
      }
    }

    void start()
    return () => {
      disposed = true
      controls?.stop()
      const stream = videoElement?.srcObject
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop())
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#101010] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f9b21d] text-[#241d00]"><Barcode className="h-5 w-5" /></span><div><h2 id="barcode-scanner-title" className="font-semibold">{title}</h2><p className="text-xs text-white/60">Use the rear camera and hold the barcode steady</p></div></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close scanner"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative aspect-[4/3] bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {status === 'starting' && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#f9b21d]" /><p className="mt-2 text-sm">Starting camera…</p></div></div>}
          {status === 'ready' && <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-[#f9b21d] shadow-[0_0_0_999px_rgba(0,0,0,.28)]"><span className="absolute left-3 right-3 top-1/2 h-px bg-[#f9b21d] shadow-[0_0_8px_#f9b21d]" /></div>}
          {status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-[#101010] p-8 text-center"><div><Camera className="mx-auto h-8 w-8 text-white/50" /><p className="mt-3 text-sm font-semibold">Camera unavailable</p><p className="mt-1 text-sm leading-6 text-white/65">{error}</p></div></div>}
        </div>
        <div className="px-4 py-3 text-center text-xs text-white/60">EAN, UPC, Code 128, Code 39, ITF and QR are supported.</div>
      </div>
    </div>
  )
}
