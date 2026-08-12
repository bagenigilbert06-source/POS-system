export interface RefundAllocationLine {
  lineSubtotal: number
  soldQuantity: number
  refundQuantity: number
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Allocates the final amount paid (including tax and discounts) across returned sale lines. */
export function calculateRefundAmount(saleSubtotal: number, saleTotal: number, lines: RefundAllocationLine[]) {
  if (!Number.isFinite(saleSubtotal) || saleSubtotal <= 0 || !Number.isFinite(saleTotal) || saleTotal < 0) {
    throw new Error('The original sale total is invalid')
  }

  const amount = lines.reduce((sum, line) => {
    if (!Number.isFinite(line.lineSubtotal) || line.lineSubtotal < 0 || !Number.isInteger(line.soldQuantity) || line.soldQuantity < 1 || !Number.isInteger(line.refundQuantity) || line.refundQuantity < 1 || line.refundQuantity > line.soldQuantity) {
      throw new Error('Invalid refund item or quantity')
    }
    const selectedSubtotal = line.lineSubtotal * (line.refundQuantity / line.soldQuantity)
    return sum + (selectedSubtotal / saleSubtotal) * saleTotal
  }, 0)

  return roundCurrency(amount)
}
