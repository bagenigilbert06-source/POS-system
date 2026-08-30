import assert from 'node:assert/strict'
import { applyPositiveBonusToDebt, applyPositivePointsToDebt, calculateMaxBonusRedemption, calculateMaxPointsRedemption, calculatePointsEarned, preTaxRewardAmount, reverseBonusWithDebt, reversePointsWithDebt, type RewardRuleSettings } from '../lib/rewards/rules'

const settings: RewardRuleSettings = {
  loyaltyEnabled: true, spendPerPoint: 100, pointValue: 1, minimumRedemptionPoints: 100,
  maximumPointsRedemptionPercent: 25, minimumEligibleSpend: 0, bonusEnabled: true,
  maximumBonusRedemptionPercent: 100, allowPointsWithBonus: true,
  discountedItemsEarnPoints: true, bonusPaidAmountEarnsPoints: false,
  loyaltyPaidAmountEarnsPoints: false, roundingMode: 'floor',
}

assert.equal(calculatePointsEarned(8_000, settings), 80)
assert.equal(calculatePointsEarned(99.99, settings), 0)
assert.equal(calculatePointsEarned(199, settings), 1)
assert.equal(calculatePointsEarned(150, { ...settings, roundingMode: 'nearest' }), 2)
assert.equal(calculatePointsEarned(101, { ...settings, roundingMode: 'ceil' }), 2)
assert.equal(calculatePointsEarned(10_000, { ...settings, loyaltyEnabled: false }), 0)
assert.equal(calculatePointsEarned(499, { ...settings, minimumEligibleSpend: 500 }), 0)

assert.deepEqual(calculateMaxPointsRedemption(240, 8_000, settings), { points: 240, value: 240 })
assert.deepEqual(calculateMaxPointsRedemption(9_000, 8_000, settings), { points: 2_000, value: 2_000 })
assert.deepEqual(calculateMaxPointsRedemption(99, 8_000, settings), { points: 0, value: 0 })
assert.deepEqual(calculateMaxPointsRedemption(100, 8_000, settings), { points: 100, value: 100 })
assert.deepEqual(calculateMaxPointsRedemption(7_480, 10_000, settings), { points: 2_500, value: 2_500 })
assert.deepEqual(calculateMaxPointsRedemption(7_480, 10_000, { ...settings, pointValue: 2 }), { points: 1_250, value: 2_500 })
const preTax = preTaxRewardAmount(15_000, { enabled: true, ratePercent: 16, pricesIncludeTax: true })
assert.equal(preTax, 12_931.03)
assert.equal(calculatePointsEarned(preTax, settings), 129)
assert.equal(preTaxRewardAmount(15_000, { enabled: true, ratePercent: 16, pricesIncludeTax: false }), 15_000)
assert.equal(calculatePointsEarned(preTaxRewardAmount(12_000, { enabled: true, ratePercent: 16, pricesIncludeTax: true }) - preTaxRewardAmount(2_000, { enabled: true, ratePercent: 16, pricesIncludeTax: true }), settings), 86)
assert.equal(calculateMaxBonusRedemption(500, 8_000, settings), 500)
assert.equal(calculateMaxBonusRedemption(5_000, 8_000, { ...settings, maximumBonusRedemptionPercent: 25 }), 2_000)
assert.equal(calculateMaxBonusRedemption(0, 8_000, settings), 0)
assert.equal(calculateMaxBonusRedemption(500, 0, settings), 0)

assert.deepEqual(reversePointsWithDebt(20, 0, 100), { balanceAfter: 0, debtAfter: 80, debtAdded: 80 })
assert.deepEqual(applyPositivePointsToDebt(100, 80), { balanceIncrease: 20, debtAfter: 0, debtPaid: 80 })
assert.deepEqual(reverseBonusWithDebt(20, 0, 100), { balanceAfter: 0, debtAfter: 80, debtAdded: 80 })
assert.deepEqual(applyPositiveBonusToDebt(100, 80), { balanceIncrease: 20, debtAfter: 0, debtPaid: 80 })

console.log('Reward rules unit tests passed')
