import assert from 'node:assert/strict'
import { calculateInvoiceTotals, configuredTax, paymentStatus } from '../lib/finance/money'

const exclusive = { enabled: true, ratePercent: 16, pricesIncludeTax: false }
assert.equal(configuredTax(100, exclusive).toFixed(2), '16.00')
const totals = calculateInvoiceTotals([{ description: 'Jameson', quantity: 2, unitPrice: 1000, discountAmount: 100 }], 200, exclusive)
assert.equal(totals.subtotal.toFixed(2), '2000.00')
assert.equal(totals.discountAmount.plus(totals.lineDiscount).toFixed(2), '300.00')
assert.equal(totals.taxableAmount.toFixed(2), '1700.00')
assert.equal(totals.taxAmount.toFixed(2), '272.00')
assert.equal(totals.total.toFixed(2), '1972.00')
assert.equal(totals.lines[0].invoiceDiscountShare.toFixed(2), '200.00')
assert.equal(totals.lines.reduce((sum, line) => sum + Number(line.tax), 0).toFixed(2), totals.taxAmount.toFixed(2))
assert.equal(totals.lines.reduce((sum, line) => sum + Number(line.total), 0).toFixed(2), totals.total.toFixed(2))

const inclusive = calculateInvoiceTotals([
  { description: 'Tax-inclusive item A', quantity: 1, unitPrice: 116 },
  { description: 'Tax-inclusive item B', quantity: 1, unitPrice: 58 },
], 17.4, { enabled: true, ratePercent: 16, pricesIncludeTax: true })
assert.equal(inclusive.total.toFixed(2), '156.60')
assert.equal(inclusive.taxableAmount.plus(inclusive.taxAmount).toFixed(2), inclusive.total.toFixed(2))
assert.equal(inclusive.lines.reduce((sum, line) => sum + Number(line.tax), 0).toFixed(2), inclusive.taxAmount.toFixed(2))
assert.equal(paymentStatus(50000, 20000, new Date(Date.now() + 86400000)).status, 'partially_paid')
assert.equal(paymentStatus(50000, 50000, new Date(Date.now() - 86400000)).status, 'paid')
assert.equal(paymentStatus(50000, 0, new Date(Date.now() - 86400000)).status, 'overdue')
console.log('invoice finance rules passed')
