import assert from 'node:assert/strict'
import { calculateNetSales, inclusivePeriodDays, paymentShareLabel, previousPeriod, resolveReportPeriod, selectReportExportRows } from '../lib/reports/report-rules'

const today = '2026-08-23'
assert.deepEqual(resolveReportPeriod('today', undefined, undefined, today), { from: '2026-08-23', to: '2026-08-23' })
assert.deepEqual(resolveReportPeriod('yesterday', undefined, undefined, today), { from: '2026-08-22', to: '2026-08-22' })
assert.deepEqual(resolveReportPeriod('7d', undefined, undefined, today), { from: '2026-08-17', to: '2026-08-23' })
assert.deepEqual(resolveReportPeriod('30d', undefined, undefined, today), { from: '2026-07-25', to: '2026-08-23' })
assert.deepEqual(resolveReportPeriod('this_month', undefined, undefined, today), { from: '2026-08-01', to: '2026-08-23' })
assert.deepEqual(resolveReportPeriod('last_month', undefined, undefined, today), { from: '2026-07-01', to: '2026-07-31' })
assert.deepEqual(resolveReportPeriod('last_month', undefined, undefined, '2026-01-05'), { from: '2025-12-01', to: '2025-12-31' })
assert.deepEqual(resolveReportPeriod('custom', '2024-02-28', '2024-03-01', today), { from: '2024-02-28', to: '2024-03-01' })
assert.deepEqual(resolveReportPeriod('custom', 'invalid', '2024-03-01', today), { from: '2026-08-01', to: today })

assert.equal(inclusivePeriodDays('2026-08-17', '2026-08-23'), 7)
assert.deepEqual(previousPeriod('2026-08-17', '2026-08-23'), { from: '2026-08-10', to: '2026-08-16' })
assert.deepEqual(previousPeriod('2026-03-01', '2026-03-30'), { from: '2026-01-30', to: '2026-02-28' })

assert.equal(calculateNetSales(1000, 100), 900)
assert.equal(calculateNetSales(1000, 1200), 0)
assert.equal(paymentShareLabel(0.07, 100), '<0.1%')
assert.equal(paymentShareLabel(99.99, 100), '99.9%')
assert.equal(paymentShareLabel(100, 100), '100.0%')
assert.equal(paymentShareLabel(0, 100), '0.0%')

const exportRows = { summary: [['summary']], monthly: [['monthly']], payments: [['payments']], products: [['products']], inventory: [['inventory']], shifts: [['shifts']] }
assert.deepEqual(selectReportExportRows('products', exportRows), [['products']])
assert.deepEqual(selectReportExportRows('payments', exportRows), [['payments']])
assert.deepEqual(selectReportExportRows('inventory', exportRows), [['inventory']])
assert.deepEqual(selectReportExportRows('shifts', exportRows), [['shifts']])
assert.deepEqual(selectReportExportRows('sales', exportRows), [['summary'], [], ['monthly']])
assert.deepEqual(selectReportExportRows('tax', exportRows), [['summary']])
assert.deepEqual(selectReportExportRows('overview', exportRows), [['summary'], [], ['monthly'], [], ['payments'], [], ['products']])

console.log('Report date, comparison, net-sales, and payment-share rules passed')
