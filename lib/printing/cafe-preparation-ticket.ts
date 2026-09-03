import type { ReceiptPaperWidth } from './receipt-print-service'

export type CafePreparationTicket = {
  orderNumber: number
  orderType: string
  tableName?: string | null
  createdAt: Date | string
  stationName?: string | null
  lines: Array<{ quantity: number; itemName: string; sizeName?: string | null; notes?: string | null; modifiers: string[] }>
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))

/** A deliberately non-financial ticket for a barista or kitchen printer. */
export function renderCafePreparationTicket(ticket: CafePreparationTicket, paperWidth: ReceiptPaperWidth = 80) {
  const orderType = ticket.orderType.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  const timestamp = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.createdAt))
  const lines = ticket.lines.map((line) => `<section class="line"><strong>${line.quantity}× ${escapeHtml(line.itemName)}${line.sizeName ? ` · ${escapeHtml(line.sizeName)}` : ''}</strong>${line.modifiers.map((modifier) => `<div class="detail">• ${escapeHtml(modifier)}</div>`).join('')}${line.notes ? `<div class="note">Note: ${escapeHtml(line.notes)}</div>` : ''}</section>`).join('')
  return `<main class="receipt-paper cafe-preparation-ticket" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:4mm 3mm;color:#000;background:#fff;font-size:12px;line-height:1.4"><style>.cafe-preparation-ticket header{text-align:center}.cafe-preparation-ticket h1{font-size:17px;letter-spacing:.06em;margin:0}.cafe-preparation-ticket p{margin:2px 0}.cafe-preparation-ticket hr{border:0;border-top:1px dashed #000;margin:9px 0}.cafe-preparation-ticket .line{margin:0 0 9px}.cafe-preparation-ticket .detail,.cafe-preparation-ticket .note{padding-left:12px;margin-top:2px}.cafe-preparation-ticket .note{font-weight:700}</style><header><h1>PESABY CAFÉ</h1><p>PREPARATION TICKET</p></header><hr><p><strong>ORDER #${ticket.orderNumber}</strong></p><p>${escapeHtml(orderType)}${ticket.tableName ? ` · ${escapeHtml(ticket.tableName)}` : ''}</p>${ticket.stationName ? `<p>Station: ${escapeHtml(ticket.stationName)}</p>` : ''}<p>${escapeHtml(timestamp)}</p><hr>${lines}<hr><p style="text-align:center">No prices or payment details</p></main>`
}
