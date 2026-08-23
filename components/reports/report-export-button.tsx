'use client'

import { Download } from 'lucide-react'
import { selectReportExportRows } from '@/lib/reports/report-rules'

interface ReportExportButtonProps {
  section: string
  location: string
  period: string
  currency: string
  totals: {
    revenue: number
    grossSales: number
    refunds: number
    transactions: number
    averageSale: number
    tax: number
    discounts: number
    costOfGoods: number
    grossProfit: number
    expenses: number
    netProfit: number
    costDataComplete: boolean
  }
  monthly: { month: string; revenue: number; refunds: number; expenses: number; netProfit: number; count: number }[]
  payments: { method: string; amount: number; transactions: number }[]
  topProducts: { name: string; quantity: number; revenue: number; profit: number | null }[]
  shifts?: Array<{ sessionNo: string; cashierName: string; terminalName: string; locationName: string; openedAt: Date; closedAt: Date | null; openingCash: string; expectedCash: string | null; closingCash: string | null; variance: string | null; varianceReason: string | null; approvedByName?: string | null; status: string; sales: { method: string; total: number }[]; refunds: { total: number }[]; movements: { type: string; total: number }[] }>
  inventory?: { cost: number; retailValue: number; products: number; units: number; lowStock: number; outOfStock: number; reorderValue: number }
}

function csvCell(value: string | number) {
  const normalized = String(value).replace(/"/g, '""')
  return `"${normalized}"`
}

export function ReportExportButton({
  section,
  location,
  period,
  currency,
  totals,
  monthly,
  payments,
  topProducts,
  shifts = [],
  inventory,
}: ReportExportButtonProps) {
  const download = () => {
    const summary: Array<Array<string | number>> = [
      ['Financial summary'],
      ['Net sales', totals.revenue],
      ['Gross sales', totals.grossSales],
      ['Refunds', totals.refunds],
      ['Completed transactions', totals.transactions],
      ['Average transaction', totals.averageSale],
      ['Recorded tax', totals.tax],
      ['Discounts', totals.discounts],
      ['Cost of goods', totals.costDataComplete ? totals.costOfGoods : 'Cost incomplete'],
      ['Gross profit', totals.costDataComplete ? totals.grossProfit : 'Cost incomplete'],
      ['Operating expenses', totals.expenses],
      ['Net profit', totals.costDataComplete ? totals.netProfit : 'Cost incomplete'],
    ]
    const monthlyRows: Array<Array<string | number>> = [['Monthly performance'], ['Month', 'Net sales', 'Refunds', 'Expenses', 'Net position', 'Transactions'], ...monthly.map((item) => [item.month, item.revenue, item.refunds, item.expenses, item.netProfit, item.count])]
    const paymentRows: Array<Array<string | number>> = [['Payment methods'], ['Method', 'Amount', 'Transactions'], ...payments.map((item) => [item.method, item.amount, item.transactions])]
    const productRows: Array<Array<string | number>> = [['Top products'], ['Product', 'Quantity', 'Revenue', 'Profit'], ...topProducts.map((item) => [item.name, item.quantity, item.revenue, item.profit ?? 'Cost unavailable'])]
    const shiftRows: Array<Array<string | number>> = [['Shift and cash report'], ['Shift', 'Cashier', 'Register', 'Location', 'Opened at', 'Closed at', 'Opening float', 'Cash sales', 'M-Pesa sales', 'Card sales', 'Refunds', 'Cash in', 'Cash out', 'Safe drops', 'Expected cash', 'Counted cash', 'Variance', 'Status', 'Variance reason', 'Approved by'], ...shifts.map((shift) => { const method = (name: string) => shift.sales.filter((row) => row.method.toLowerCase().replace(/[^a-z0-9]/g, '') === name).reduce((sum, row) => sum + row.total, 0); const movement = (name: string) => shift.movements.filter((row) => row.type === name).reduce((sum, row) => sum + row.total, 0); return [shift.sessionNo, shift.cashierName, shift.terminalName, shift.locationName, shift.openedAt.toISOString(), shift.closedAt?.toISOString() ?? '', Number(shift.openingCash), method('cash'), method('mpesa'), method('card'), shift.refunds.reduce((sum, row) => sum + row.total, 0), movement('cash_in'), movement('cash_out'), movement('safe_drop'), Number(shift.expectedCash ?? 0), Number(shift.closingCash ?? 0), Number(shift.variance ?? 0), shift.status, shift.varianceReason ?? '', shift.approvedByName ?? ''] })]
    const inventoryRows: Array<Array<string | number>> = inventory ? [['Inventory value'], ['Products tracked', inventory.products], ['Available units', inventory.units], ['Inventory cost', inventory.cost], ['Estimated retail value', inventory.retailValue], ['Potential gross margin', Math.max(0, inventory.retailValue - inventory.cost)], ['Low stock', inventory.lowStock], ['Out of stock', inventory.outOfStock], ['Reorder value', inventory.reorderValue]] : []
    const selectedRows = selectReportExportRows(section, { summary, monthly: monthlyRows, payments: paymentRows, products: productRows, inventory: inventoryRows, shifts: shiftRows })
    const rows: Array<Array<string | number>> = [
      [`Pesaby ${section} report`, period],
      ['Location', location],
      ['Currency', currency],
      [],
      ...selectedRows,
    ]
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pesaby-${section}-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-xs font-semibold text-[var(--dashboard-text)] shadow-sm transition-colors hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
    >
      <Download className="h-4 w-4 text-[var(--dashboard-accent)]" aria-hidden="true" />
      Export CSV
    </button>
  )
}
