export function calculateMpesaAmount(value: number) {
  if (!Number.isFinite(value)) throw new Error('Invalid M-Pesa amount')
  const unroundedAmount = Number(value.toFixed(2))
  const amount = Math.round(unroundedAmount)
  return { amount, roundingAmount: Number((amount - unroundedAmount).toFixed(2)) }
}
