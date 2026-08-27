export type RewardRoundingMode = 'floor' | 'nearest' | 'ceil'

export interface RewardRuleSettings {
  loyaltyEnabled: boolean
  spendPerPoint: number
  pointValue: number
  minimumRedemptionPoints: number
  maximumPointsRedemptionPercent: number
  minimumEligibleSpend: number
  bonusEnabled: boolean
  maximumBonusRedemptionPercent: number
  allowPointsWithBonus: boolean
  discountedItemsEarnPoints: boolean
  bonusPaidAmountEarnsPoints: boolean
  loyaltyPaidAmountEarnsPoints: boolean
  roundingMode: RewardRoundingMode
}

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculatePointsEarned(eligibleSpend: number, settings: RewardRuleSettings) {
  if (!settings.loyaltyEnabled || eligibleSpend < settings.minimumEligibleSpend || eligibleSpend <= 0) return 0
  const raw = eligibleSpend / settings.spendPerPoint
  return settings.roundingMode === 'ceil' ? Math.ceil(raw) : settings.roundingMode === 'nearest' ? Math.round(raw) : Math.floor(raw)
}

export function calculateMaxPointsRedemption(pointsBalance: number, eligibleSale: number, settings: RewardRuleSettings) {
  if (!settings.loyaltyEnabled || pointsBalance < settings.minimumRedemptionPoints || eligibleSale <= 0) return { points: 0, value: 0 }
  const valueCap = money(eligibleSale * settings.maximumPointsRedemptionPercent / 100)
  const pointsCap = Math.floor(valueCap / settings.pointValue)
  const points = Math.max(0, Math.min(pointsBalance, pointsCap))
  return { points, value: money(points * settings.pointValue) }
}

export function calculateMaxBonusRedemption(bonusBalance: number, eligibleSale: number, settings: RewardRuleSettings) {
  if (!settings.bonusEnabled || bonusBalance <= 0 || eligibleSale <= 0) return 0
  return money(Math.min(bonusBalance, eligibleSale * settings.maximumBonusRedemptionPercent / 100))
}

export function applyPositivePointsToDebt(points: number, debt: number) {
  const debtPaid = Math.min(points, debt)
  return { balanceIncrease: points - debtPaid, debtAfter: debt - debtPaid, debtPaid }
}

export function reversePointsWithDebt(balance: number, debt: number, points: number) {
  const removed = Math.min(balance, points)
  return { balanceAfter: balance - removed, debtAfter: debt + points - removed, debtAdded: points - removed }
}

export function applyPositiveBonusToDebt(amount: number, debt: number) {
  const debtPaid = money(Math.min(amount, debt))
  return { balanceIncrease: money(amount - debtPaid), debtAfter: money(debt - debtPaid), debtPaid }
}

export function reverseBonusWithDebt(balance: number, debt: number, amount: number) {
  const removed = money(Math.min(balance, amount))
  return { balanceAfter: money(balance - removed), debtAfter: money(debt + amount - removed), debtAdded: money(amount - removed) }
}
