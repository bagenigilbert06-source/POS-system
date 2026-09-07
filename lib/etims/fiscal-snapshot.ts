import { EtimsValidationError, type EtimsInvoice, type EtimsInvoiceLine } from './types'

export type ReturnedFiscalLine = { originalSaleItemId: string | null; productId: string; quantity: number }

export function readFiscalSnapshot(value: unknown): EtimsInvoice {
  if (!value || typeof value !== 'object') throw new EtimsValidationError('Original fiscal snapshot is unavailable.', 'FISCAL_SNAPSHOT_MISSING')
  const item = value as Partial<EtimsInvoice>
  if (!Array.isArray(item.lines) || !item.business || !item.receiptNumber || !Number.isInteger(item.providerInvoiceNumber)) throw new EtimsValidationError('Original fiscal snapshot is invalid.', 'FISCAL_SNAPSHOT_INVALID')
  return item as EtimsInvoice
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** Reconstructs refund lines exclusively from the immutable submitted invoice.
 * Current catalogue price, tax and classification never participate. */
export function reconstructCreditLines(snapshot: EtimsInvoice, returns: ReturnedFiscalLine[]): EtimsInvoiceLine[] {
  return returns.map((returned, index) => {
    const original = snapshot.lines.find((line) => returned.originalSaleItemId ? line.saleItemId === returned.originalSaleItemId : line.productId === returned.productId)
    if (!original || returned.quantity <= 0 || returned.quantity > original.quantity) throw new EtimsValidationError('Returned quantity does not match the original fiscal line.', 'FISCAL_RETURN_LINE_INVALID')
    const ratio = returned.quantity / original.quantity
    return { ...original, lineNumber: index + 1, quantity: returned.quantity, packageQuantity: returned.quantity,
      grossAmount: money(original.grossAmount * ratio), discountAmount: money(original.discountAmount * ratio),
      taxableAmount: money(original.taxableAmount * ratio), taxAmount: money(original.taxAmount * ratio), totalAmount: money(original.totalAmount * ratio) }
  })
}
