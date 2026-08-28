'use client'

export type ReceiptPrintingMode = 'direct' | 'browser'
export type ReceiptPaperWidth = 58 | 80
export type ReceiptPrinterStatus = 'ready' | 'unavailable' | 'printing' | 'error'
export type ReceiptPrinterSettings = {
  mode: ReceiptPrintingMode
  printerName: string
  paperWidth: ReceiptPaperWidth
  autoPrint: boolean
  customerCopy: boolean
  copies: number
  cashDrawerPulse: boolean
}
export type ReceiptPrintResult = { mechanism: ReceiptPrintingMode; submitted: boolean; status: ReceiptPrinterStatus }

let securityConfigured = false

const printedStyleProperties = [
  'display', 'position', 'box-sizing', 'width', 'max-width', 'height', 'margin', 'padding',
  'grid-template-columns', 'gap', 'align-items', 'justify-content', 'text-align',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform',
  'white-space', 'overflow-wrap', 'word-break', 'color', 'background-color',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
] as const

/** Captures only the already-rendered receipt, never surrounding dashboard UI. */
export function captureReceiptHtml(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  const sources = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))]
  const targets = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  sources.forEach((source, index) => {
    const target = targets[index]
    if (!target) return
    const computed = window.getComputedStyle(source)
    for (const property of printedStyleProperties) target.style.setProperty(property, computed.getPropertyValue(property))
    if (source instanceof HTMLImageElement && target instanceof HTMLImageElement) target.src = source.currentSrc || source.src
  })
  clone.style.width = '100%'; clone.style.maxWidth = 'none'; clone.style.margin = '0'; clone.style.boxShadow = 'none'; clone.style.borderRadius = '0'
  return clone.outerHTML
}

async function qzClient() {
  const { default: qz } = await import('qz-tray')
  if (!securityConfigured) {
    const certificate = await fetch('/api/printing/qz/certificate', { cache: 'no-store' }).then(async (response) => response.ok ? response.text() : '')
    if (certificate) {
      qz.security.setCertificatePromise((resolve) => resolve(certificate))
      qz.security.setSignatureAlgorithm('SHA512')
      qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
        fetch('/api/printing/qz/sign', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: toSign, cache: 'no-store' })
          .then(async (response) => response.ok ? resolve(await response.text()) : reject(new Error(await response.text())))
          .catch(reject)
      })
    }
    securityConfigured = true
  }
  if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 })
  return qz
}

export async function getDirectPrinterStatus(printerName: string): Promise<ReceiptPrinterStatus> {
  if (!printerName.trim()) return 'unavailable'
  try {
    const qz = await qzClient()
    const found = await qz.printers.find(printerName)
    const names = Array.isArray(found) ? found : [found]
    return names.some((name) => name === printerName) ? 'ready' : 'unavailable'
  } catch { return 'unavailable' }
}

export async function listDirectPrinters(): Promise<string[]> {
  const qz = await qzClient()
  const found = await qz.printers.find()
  return Array.isArray(found) ? found : [found]
}

function thermalDocument(receiptHtml: string, width: ReceiptPaperWidth) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${width}mm auto;margin:0}html,body{width:${width}mm;margin:0;padding:0;background:#fff;color:#000}.receipt-paper{box-sizing:border-box!important;width:${width}mm!important;max-width:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#000!important}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body>${receiptHtml}</body></html>`
}

export async function directPrintReceipt(receiptHtml: string, settings: ReceiptPrinterSettings): Promise<ReceiptPrintResult> {
  if (!settings.printerName.trim()) throw new Error('No thermal printer is configured')
  const qz = await qzClient()
  const config = qz.configs.create(settings.printerName, { units: 'mm', size: { width: settings.paperWidth }, margins: 0, colorType: 'grayscale', copies: Math.max(1, Math.min(5, settings.copies)), scaleContent: true })
  const data: Array<Record<string, unknown>> = [{ type: 'pixel', format: 'html', flavor: 'plain', data: thermalDocument(receiptHtml, settings.paperWidth) }]
  if (settings.cashDrawerPulse) data.push({ type: 'raw', format: 'command', flavor: 'plain', data: '\x1B\x70\x00\x19\xFA' })
  await qz.print(config, data)
  return { mechanism: 'direct', submitted: true, status: 'ready' }
}

export function browserPrintReceipt(receiptHtml: string, paperWidth: ReceiptPaperWidth): ReceiptPrintResult {
  const frame = document.createElement('iframe')
  const removeFrame = () => {
    if (frame.parentNode) frame.parentNode.removeChild(frame)
  }
  frame.setAttribute('aria-hidden', 'true')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' })
  document.body.appendChild(frame)
  const printWindow = frame.contentWindow, printDocument = frame.contentDocument
  if (!printWindow || !printDocument) { removeFrame(); throw new Error('Could not open browser printing') }
  const assets = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).map((node) => node.outerHTML).join('')
  printDocument.open(); printDocument.write(thermalDocument(receiptHtml, paperWidth).replace('<head>', `<head>${assets}`)); printDocument.close()
  printWindow.addEventListener('afterprint', () => window.setTimeout(removeFrame, 250), { once: true })
  window.setTimeout(() => { printWindow.focus(); printWindow.print() }, 150)
  return { mechanism: 'browser', submitted: false, status: 'ready' }
}
