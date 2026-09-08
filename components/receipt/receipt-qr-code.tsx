'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function ReceiptQrCode({ saleId, receiptNo, total, paymentMethod, createdAt, value, label, size = 80 }: { saleId: string; receiptNo: string; total: string; paymentMethod: string; createdAt: Date | string; value?: string; label?: string; size?: number }) {
  const [src, setSrc] = useState('')
  const payload = value || `PESABY RECEIPT\nReceipt: ${receiptNo}\nSale ID: ${saleId}\nTotal: ${total}\nPayment: ${paymentMethod}\nDate: ${new Date(createdAt).toISOString()}`

  useEffect(() => {
    let active = true
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: Math.max(192, size * 3), color: { dark: '#000000', light: '#FFFFFF' } }))
      .then((dataUrl) => { if (active) setSrc(dataUrl) })
      .catch(() => { if (active) setSrc('') })
    return () => { active = false }
  }, [payload, size])

  if (!src) return <div style={{ width: size, height: size }} className="bg-white" aria-label="Generating receipt QR code" />
  return <Image src={src} alt={label || `QR code for receipt ${receiptNo}`} width={size} height={size} unoptimized style={{ width: size, height: size }} className="bg-white object-contain" />
}
