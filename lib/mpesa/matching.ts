/** Never guess between two Till checkouts, even when their amounts are equal. */
export function selectUnambiguousTillCandidate<T extends { amount: string }>(candidates: T[], paidAmount: number): T | null {
  const exact = candidates.filter((candidate) => Number(candidate.amount) === paidAmount)
  return exact.length === 1 ? exact[0] : null
}
