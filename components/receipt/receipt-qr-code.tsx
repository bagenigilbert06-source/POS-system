'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function ReceiptQrCode({ saleId, receiptNo, total, paymentMethod, createdAt }: { saleId: string; receiptNo: string; total: string; paymentMethod: string; createdAt: Date | string }) {
  const [src, setSrc] = useState('')
  const payload = `PESABY RECEIPT\nReceipt: ${receiptNo}\nSale ID: ${saleId}\nTotal: ${total}\nPayment: ${paymentMethod}\nDate: ${new Date(createdAt).toISOString()}`

  useEffect(() => {
    let active = true
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 192, color: { dark: '#000000', light: '#FFFFFF' } }))
      .then((dataUrl) => { if (active) setSrc(dataUrl) })
      .catch(() => { if (active) setSrc('') })
    return () => { active = false }
  }, [payload])

  if (!src) return <div className="h-20 w-20 bg-white" aria-label="Generating receipt QR code" />
  return <Image src={src} alt={`QR code for receipt ${receiptNo}`} width={96} height={96} unoptimized className="h-20 w-20 bg-white object-contain" />
}
