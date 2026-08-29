import Decimal from 'decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export type TaxPolicy = { enabled: boolean; ratePercent: number; pricesIncludeTax: boolean }
export type InvoiceLineInput = { description: string; quantity: number; unitPrice: number; discountAmount?: number; sku?: string; unit?: string }

export function money(value: Decimal.Value) { return new Decimal(value).toDecimalPlaces(2) }

/** Shared configured-tax calculation used by POS and invoicing. */
export function configuredTax(amount: Decimal.Value, policy: TaxPolicy) {
  const base = money(amount)
  if (!policy.enabled || policy.ratePercent <= 0) return money(0)
  const rate = new Decimal(policy.ratePercent).div(100)
  return money(policy.pricesIncludeTax ? base.minus(base.div(rate.plus(1))) : base.mul(rate))
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[], invoiceDiscount: number, policy: TaxPolicy) {
  if (!lines.length) throw new Error('Add at least one invoice item')
  const normalized = lines.map((line) => {
    if (!line.description.trim()) throw new Error('Every invoice item needs a description')
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Invoice quantities must be positive whole numbers')
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) throw new Error('Invoice unit prices must be valid non-negative amounts')
    const gross = money(new Decimal(line.unitPrice).mul(line.quantity))
    const discount = money(line.discountAmount ?? 0)
    if (discount.isNegative() || discount.greaterThan(gross)) throw new Error('Line discount cannot exceed the line amount')
    const afterDiscount = gross.minus(discount)
    return { ...line, description: line.description.trim(), gross, discount, afterDiscount }
  })
  const subtotal = money(normalized.reduce((sum, line) => sum.plus(line.gross), new Decimal(0)))
  const lineDiscount = money(normalized.reduce((sum, line) => sum.plus(line.discount), new Decimal(0)))
  const discountAmount = money(invoiceDiscount)
  const available = subtotal.minus(lineDiscount)
  if (discountAmount.isNegative() || discountAmount.greaterThan(available)) throw new Error('Invoice discount cannot exceed the discounted subtotal')
  const taxableBeforeInvoiceDiscount = available.minus(discountAmount)
  const taxAmount = configuredTax(taxableBeforeInvoiceDiscount, policy)
  const taxableAmount = money(policy.pricesIncludeTax ? taxableBeforeInvoiceDiscount.minus(taxAmount) : taxableBeforeInvoiceDiscount)
  const total = money(policy.pricesIncludeTax ? taxableBeforeInvoiceDiscount : taxableBeforeInvoiceDiscount.plus(taxAmount))
  let allocatedDiscount = money(0)
  let allocatedTax = money(0)
  const allocatedLines = normalized.map((line, index) => {
    const isLast = index === normalized.length - 1
    const invoiceDiscountShare = isLast
      ? money(discountAmount.minus(allocatedDiscount))
      : money(available.isZero() ? 0 : discountAmount.mul(line.afterDiscount).div(available))
    allocatedDiscount = money(allocatedDiscount.plus(invoiceDiscountShare))
    const discountedAmount = money(line.afterDiscount.minus(invoiceDiscountShare))
    const lineTax = isLast
      ? money(taxAmount.minus(allocatedTax))
      : configuredTax(discountedAmount, policy)
    allocatedTax = money(allocatedTax.plus(lineTax))
    return {
      ...line,
      invoiceDiscountShare,
      tax: lineTax,
      total: money(policy.pricesIncludeTax ? discountedAmount : discountedAmount.plus(lineTax)),
    }
  })
  return { lines: allocatedLines, subtotal, lineDiscount, discountAmount, taxableAmount, taxAmount, total }
}

export function paymentStatus(total: Decimal.Value, amountPaid: Decimal.Value, dueDate: Date | null, now = new Date()) {
  const totalMoney = money(total), paid = money(amountPaid), balance = money(totalMoney.minus(paid))
  if (balance.lessThanOrEqualTo(0)) return { status: 'paid', balance: money(0) }
  if (dueDate && dueDate.getTime() < now.getTime()) return { status: 'overdue', balance }
  if (paid.greaterThan(0)) return { status: 'partially_paid', balance }
  return { status: 'issued', balance }
}
