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
export type ReceiptPrinterErrorCode =
  | 'SECURITY_NOT_CONFIGURED'
  | 'QZ_NOT_RUNNING'
  | 'QZ_CONNECTION_TIMEOUT'
  | 'PRINTER_LOOKUP_TIMEOUT'
  | 'PRINTER_NOT_FOUND'
  | 'PRINT_SUBMISSION_TIMEOUT'
  | 'PRINT_SUBMISSION_FAILED'

const RAW_TCP_PRINTER_PATTERN = /^tcp:\/\/[^/:\s]+:\d{1,5}$/i

function isRawTcpPrinter(printerName: string) {
  return RAW_TCP_PRINTER_PATTERN.test(printerName.trim())
}

export class ReceiptPrinterError extends Error {
  constructor(public readonly code: ReceiptPrinterErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ReceiptPrinterError'
  }
}

export function getReceiptPrinterErrorCopy(error: unknown) {
  const code = error instanceof ReceiptPrinterError ? error.code : 'PRINT_SUBMISSION_FAILED'
  switch (code) {
    case 'SECURITY_NOT_CONFIGURED':
      return { title: 'Printer security configuration is incomplete.', description: 'Ask an administrator to configure QZ Tray signing.' }
    case 'QZ_CONNECTION_TIMEOUT':
      return { title: 'Could not connect to QZ Tray.', description: 'Check that QZ Tray is running, then try again.' }
    case 'QZ_NOT_RUNNING':
      return { title: 'QZ Tray is not running.', description: 'Start QZ Tray and try again.' }
    case 'PRINTER_LOOKUP_TIMEOUT':
      return { title: 'Printer lookup timed out.', description: 'Check QZ Tray and the Windows printer, then try again.' }
    case 'PRINTER_NOT_FOUND':
      return { title: 'Configured printer could not be found.', description: 'Check the Windows/QZ printer identifier in device settings.' }
    case 'PRINT_SUBMISSION_TIMEOUT':
      return { title: 'Printer unavailable.', description: 'The print request timed out. Check the printer and try again.' }
    default:
      return { title: 'Printer unavailable.', description: 'Check the printer connection and try again.' }
  }
}

/** A direct print request is possible only when the terminal has a printer name. */
export function hasConfiguredReceiptPrinter(settings: Pick<ReceiptPrinterSettings, 'mode' | 'printerName'>) {
  return settings.mode === 'direct' && Boolean(settings.printerName.trim())
}

const QZ_SECURITY_TIMEOUT_MS = 5_000
const QZ_CONNECTION_TIMEOUT_MS = 9_000
const QZ_PRINTER_LOOKUP_TIMEOUT_MS = 5_000
const QZ_PRINT_TIMEOUT_MS = 10_000

let securityPromise: Promise<void> | null = null
let connectionPromise: Promise<unknown> | null = null

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, error: ReceiptPrinterError): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(error), timeoutMs)
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value) },
      (reason) => { window.clearTimeout(timer); reject(reason) },
    )
  })
}

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
  if (!securityPromise) {
    securityPromise = withTimeout(
      fetch('/api/printing/qz/certificate', { cache: 'no-store' }).then(async (response) => {
        const unsignedDevelopmentAllowed =
          response.status === 204 && response.headers.get('x-qz-unsigned-development') === 'allowed'
        if (unsignedDevelopmentAllowed) {
          // QZ must be told explicitly that this is the opt-in unsigned
          // development path. It will show its normal untrusted-site warning,
          // but requests will no longer be reported as an unconfigured callback.
          // QZ's unsigned-development example resolves without a value. The
          // package typings require a string, so keep the runtime contract
          // explicit without sending a fabricated certificate/signature.
          qz.security.setCertificatePromise((resolve) => (resolve as unknown as () => void)())
          qz.security.setSignaturePromise(() => (resolve) => (resolve as unknown as () => void)())
          return
        }
        if (!response.ok) throw new ReceiptPrinterError('SECURITY_NOT_CONFIGURED', 'QZ signing is not configured')

        const certificate = (await response.text()).trim()
        if (!certificate) throw new ReceiptPrinterError('SECURITY_NOT_CONFIGURED', 'The QZ public certificate is empty')
        qz.security.setCertificatePromise((resolve) => resolve(certificate))
        qz.security.setSignatureAlgorithm('SHA512')
        qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
          withTimeout(
            fetch('/api/printing/qz/sign', {
              method: 'POST', headers: { 'content-type': 'text/plain' }, body: toSign, cache: 'no-store',
            }).then(async (signatureResponse) => {
              if (!signatureResponse.ok) throw new Error('QZ signing request failed')
              const signature = (await signatureResponse.text()).trim()
              if (!signature) throw new Error('QZ signing returned an empty signature')
              return signature
            }),
            QZ_SECURITY_TIMEOUT_MS,
            new ReceiptPrinterError('SECURITY_NOT_CONFIGURED', 'QZ signing timed out'),
          ).then(resolve, () => reject(new ReceiptPrinterError('SECURITY_NOT_CONFIGURED', 'QZ signing failed')))
        })
      }),
      QZ_SECURITY_TIMEOUT_MS,
      new ReceiptPrinterError('SECURITY_NOT_CONFIGURED', 'QZ security initialization timed out'),
    ).catch((error) => {
      securityPromise = null
      throw error
    })
  }
  await securityPromise

  if (!qz.websocket.isActive()) {
    if (!connectionPromise) {
      connectionPromise = withTimeout(
        qz.websocket.connect({ retries: 1, delay: 1 }),
        QZ_CONNECTION_TIMEOUT_MS,
        new ReceiptPrinterError('QZ_CONNECTION_TIMEOUT', 'QZ Tray connection timed out'),
      ).catch((error) => {
        if (error instanceof ReceiptPrinterError) throw error
        throw new ReceiptPrinterError('QZ_NOT_RUNNING', 'QZ Tray connection failed', { cause: error })
      }).finally(() => { connectionPromise = null })
    }
    await connectionPromise
  }
  return qz
}

export async function getDirectPrinterStatus(printerName: string): Promise<ReceiptPrinterStatus> {
  if (!printerName.trim()) return 'unavailable'
  if (isRawTcpPrinter(printerName)) {
    try {
      const response = await fetch('/api/printing/raw-tcp', {
        method: 'HEAD', cache: 'no-store', headers: { 'x-printer-target': printerName.trim() },
      })
      return response.ok ? 'ready' : 'unavailable'
    } catch { return 'unavailable' }
  }
  try {
    const qz = await qzClient()
    const found = await withTimeout(
      qz.printers.find(printerName), QZ_PRINTER_LOOKUP_TIMEOUT_MS,
      new ReceiptPrinterError('PRINTER_LOOKUP_TIMEOUT', 'Printer lookup timed out'),
    )
    const names = Array.isArray(found) ? found : [found]
    return names.some((name) => name === printerName) ? 'ready' : 'unavailable'
  } catch { return 'unavailable' }
}

export async function listDirectPrinters(): Promise<string[]> {
  const qz = await qzClient()
  const found = await withTimeout(
    qz.printers.find(), QZ_PRINTER_LOOKUP_TIMEOUT_MS,
    new ReceiptPrinterError('PRINTER_LOOKUP_TIMEOUT', 'Printer discovery timed out'),
  )
  return Array.isArray(found) ? found : [found]
}

function thermalDocument(receiptHtml: string, width: ReceiptPaperWidth) {
  // Use table alignment rather than flex: QZ's PDFBOX renderer supports the
  // former consistently, so an 80 mm receipt is centered on an A4/Letter PDF
  // while remaining a full-width roll on a matching thermal printer.
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${width}mm auto;margin:0}html,body{width:100%;margin:0;padding:0;background:#fff;color:#000}.receipt-print-frame{width:100%;border-collapse:collapse}.receipt-print-frame td{padding:0;text-align:center;vertical-align:top}.receipt-paper{box-sizing:border-box!important;width:${width}mm!important;max-width:${width}mm!important;margin:0 auto!important;text-align:left;border:0!important;border-radius:0!important;box-shadow:none!important;color:#000!important}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><table class="receipt-print-frame" role="presentation"><tr><td>${receiptHtml}</td></tr></table></body></html>`
}

export async function directPrintReceipt(receiptHtml: string, settings: ReceiptPrinterSettings): Promise<ReceiptPrintResult> {
  const printerName = settings.printerName.trim()
  if (!printerName) throw new ReceiptPrinterError('PRINTER_NOT_FOUND', 'No thermal printer is configured')
  if (isRawTcpPrinter(printerName)) {
    let response: Response
    try {
      response = await withTimeout(
        fetch('/api/printing/raw-tcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target: printerName, html: receiptHtml, copies: Math.max(1, Math.min(3, settings.copies)), cashDrawerPulse: settings.cashDrawerPulse }),
        }),
        QZ_PRINT_TIMEOUT_MS,
        new ReceiptPrinterError('PRINT_SUBMISSION_TIMEOUT', 'RAW TCP print submission timed out'),
      )
    } catch (error) {
      if (error instanceof ReceiptPrinterError) throw error
      throw new ReceiptPrinterError('PRINT_SUBMISSION_FAILED', 'RAW TCP print submission failed', { cause: error })
    }
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new ReceiptPrinterError(response.status === 404 ? 'PRINTER_NOT_FOUND' : 'PRINT_SUBMISSION_FAILED', message || 'RAW TCP print submission failed')
    }
    return { mechanism: 'direct', submitted: true, status: 'ready' }
  }
  const qz = await qzClient()
  let found: string | string[]
  try {
    found = await withTimeout(
      qz.printers.find(printerName), QZ_PRINTER_LOOKUP_TIMEOUT_MS,
      new ReceiptPrinterError('PRINTER_LOOKUP_TIMEOUT', 'Printer lookup timed out'),
    )
  } catch (error) {
    if (error instanceof ReceiptPrinterError) throw error
    throw new ReceiptPrinterError('PRINTER_NOT_FOUND', 'Configured printer was not found', { cause: error })
  }
  const names = (Array.isArray(found) ? found : [found]).filter(Boolean)
  if (!names.some((name) => name.localeCompare(printerName, undefined, { sensitivity: 'accent' }) === 0)) {
    throw new ReceiptPrinterError('PRINTER_NOT_FOUND', 'Configured printer was not found')
  }

  const config = qz.configs.create(printerName, { units: 'mm', size: { width: settings.paperWidth }, margins: 0, colorType: 'grayscale', copies: Math.max(1, Math.min(3, settings.copies)), scaleContent: true })
  const data: Array<Record<string, unknown>> = [{ type: 'pixel', format: 'html', flavor: 'plain', data: thermalDocument(receiptHtml, settings.paperWidth) }]
  if (settings.cashDrawerPulse && !/^microsoft print to pdf$/i.test(printerName)) {
    data.push({ type: 'raw', format: 'command', flavor: 'plain', data: '\x1B\x70\x00\x19\xFA' })
  }
  try {
    await withTimeout(
      qz.print(config, data), QZ_PRINT_TIMEOUT_MS,
      new ReceiptPrinterError('PRINT_SUBMISSION_TIMEOUT', 'Print submission timed out'),
    )
  } catch (error) {
    if (error instanceof ReceiptPrinterError) throw error
    throw new ReceiptPrinterError('PRINT_SUBMISSION_FAILED', 'Print submission failed', { cause: error })
  }
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
