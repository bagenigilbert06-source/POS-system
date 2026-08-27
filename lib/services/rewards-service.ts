import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvent, customer, customerRewardAccount, rewardBranchEligibility, rewardCategoryEligibility, rewardLedger, rewardProductEligibility, rewardReservation, rewardSettings, sale, salesReturn } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { PermissionEnum } from '@/lib/types/permissions'
import { requirePermission } from '@/lib/auth/authorization'
import { applyPositiveBonusToDebt, applyPositivePointsToDebt, calculateMaxBonusRedemption, calculateMaxPointsRedemption, calculatePointsEarned, money, reverseBonusWithDebt, reversePointsWithDebt, type RewardRuleSettings, type RewardRoundingMode } from '@/lib/rewards/rules'

export type RewardTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type RewardLedgerType = 'POINTS_OPENING' | 'POINTS_EARNED' | 'POINTS_REDEEMED' | 'POINTS_REVERSED' | 'POINTS_ADJUSTED' | 'POINTS_EXPIRED' | 'BONUS_OPENING' | 'BONUS_CREDITED' | 'BONUS_REDEEMED' | 'BONUS_REVERSED' | 'BONUS_ADJUSTED' | 'BONUS_EXPIRED'

export interface RewardSettingsModel extends RewardRuleSettings {
  id: string
  organizationId: string
  pointsExpiryDays: number | null
}

export interface RewardSaleLine {
  productId: string
  categoryId: string | null
  amount: number
  discounted?: boolean
}

const defaults: Omit<RewardSettingsModel, 'id' | 'organizationId'> = {
  loyaltyEnabled: true, spendPerPoint: 100, pointValue: 1, minimumRedemptionPoints: 100,
  maximumPointsRedemptionPercent: 50, minimumEligibleSpend: 0, pointsExpiryDays: null,
  bonusEnabled: true, maximumBonusRedemptionPercent: 100, allowPointsWithBonus: true,
  discountedItemsEarnPoints: true, bonusPaidAmountEarnsPoints: false,
  loyaltyPaidAmountEarnsPoints: false, roundingMode: 'floor',
}

function mapSettings(row: typeof rewardSettings.$inferSelect): RewardSettingsModel {
  return {
    id: row.id, organizationId: row.organizationId, loyaltyEnabled: row.loyaltyEnabled,
    spendPerPoint: Number(row.spendPerPoint), pointValue: Number(row.pointValue),
    minimumRedemptionPoints: row.minimumRedemptionPoints,
    maximumPointsRedemptionPercent: Number(row.maximumPointsRedemptionPercent),
    minimumEligibleSpend: Number(row.minimumEligibleSpend), pointsExpiryDays: row.pointsExpiryDays,
    bonusEnabled: row.bonusEnabled, maximumBonusRedemptionPercent: Number(row.maximumBonusRedemptionPercent),
    allowPointsWithBonus: row.allowPointsWithBonus, discountedItemsEarnPoints: row.discountedItemsEarnPoints,
    bonusPaidAmountEarnsPoints: row.bonusPaidAmountEarnsPoints,
    loyaltyPaidAmountEarnsPoints: row.loyaltyPaidAmountEarnsPoints,
    roundingMode: row.roundingMode as RewardRoundingMode,
  }
}

export async function getRewardSettings(organizationId: string, tx: RewardTransaction | typeof db = db) {
  const [row] = await tx.select().from(rewardSettings).where(eq(rewardSettings.organizationId, organizationId)).limit(1)
  if (row) return mapSettings(row)
  const id = generateId()
  const [created] = await tx.insert(rewardSettings).values({ id, organizationId }).onConflictDoNothing({ target: rewardSettings.organizationId }).returning()
  if (created) return mapSettings(created)
  const [concurrent] = await tx.select().from(rewardSettings).where(eq(rewardSettings.organizationId, organizationId)).limit(1)
  return concurrent ? mapSettings(concurrent) : { id, organizationId, ...defaults }
}

async function ensureRewardAccount(tx: RewardTransaction, organizationId: string, customerId: string) {
  const [owned] = await tx.select({ id: customer.id, legacyPoints: customer.loyaltyPoints }).from(customer).where(and(eq(customer.id, customerId), eq(customer.orgId, organizationId))).limit(1)
  if (!owned) throw new Error('Customer is not available in this workspace')
  await tx.insert(customerRewardAccount).values({ id: generateId(), organizationId, customerId, pointsBalance: Math.max(0, owned.legacyPoints), lifetimePointsEarned: Math.max(0, owned.legacyPoints) }).onConflictDoNothing({ target: customerRewardAccount.customerId })
  const [account] = await tx.select().from(customerRewardAccount).where(and(eq(customerRewardAccount.customerId, customerId), eq(customerRewardAccount.organizationId, organizationId))).limit(1).for('update')
  if (!account) throw new Error('Could not initialize customer rewards')
  return account
}

export async function getRewardAccount(organizationId: string, customerId: string) {
  return db.transaction((tx) => ensureRewardAccount(tx, organizationId, customerId))
}

export async function getRewardSummary(organizationId: string, customerId: string) {
  const [account, settings] = await Promise.all([getRewardAccount(organizationId, customerId), getRewardSettings(organizationId)])
  return { ...account, bonusBalance: Number(account.bonusBalance), bonusDebt: Number(account.bonusDebt), pointsValue: money(account.pointsBalance * settings.pointValue), settings }
}

async function eligibleLines(tx: RewardTransaction, settings: RewardSettingsModel, branchId: string, kind: 'loyalty' | 'bonus', lines: RewardSaleLine[]) {
  const branches = await tx.select({ branchId: rewardBranchEligibility.branchId }).from(rewardBranchEligibility).where(and(eq(rewardBranchEligibility.rewardSettingsId, settings.id), eq(rewardBranchEligibility.rewardKind, kind)))
  if (branches.length && !branches.some((row) => row.branchId === branchId)) throw new Error(`${kind === 'loyalty' ? 'Loyalty' : 'Bonus'} rewards are unavailable at this branch`)
  const [productScopes, categoryScopes] = await Promise.all([
    tx.select().from(rewardProductEligibility).where(and(eq(rewardProductEligibility.rewardSettingsId, settings.id), eq(rewardProductEligibility.rewardKind, kind))),
    tx.select().from(rewardCategoryEligibility).where(and(eq(rewardCategoryEligibility.rewardSettingsId, settings.id), eq(rewardCategoryEligibility.rewardKind, kind))),
  ])
  const includedProducts = new Set(productScopes.filter((row) => row.mode === 'include').map((row) => row.productId))
  const excludedProducts = new Set(productScopes.filter((row) => row.mode === 'exclude').map((row) => row.productId))
  const includedCategories = new Set(categoryScopes.filter((row) => row.mode === 'include').map((row) => row.categoryId))
  const excludedCategories = new Set(categoryScopes.filter((row) => row.mode === 'exclude').map((row) => row.categoryId))
  const hasIncludes = includedProducts.size > 0 || includedCategories.size > 0
  return lines.map((line) => {
    const included = !hasIncludes || includedProducts.has(line.productId) || Boolean(line.categoryId && includedCategories.has(line.categoryId))
    const excluded = excludedProducts.has(line.productId) || Boolean(line.categoryId && excludedCategories.has(line.categoryId))
    const discountEligible = settings.discountedItemsEarnPoints || !line.discounted
    return { ...line, eligibleAmount: included && !excluded && (kind === 'bonus' || discountEligible) ? money(line.amount) : 0 }
  })
}

async function addLedger(tx: RewardTransaction, input: { organizationId: string; customerId: string; accountId: string; branchId?: string | null; saleId?: string; salesReturnId?: string; type: RewardLedgerType; pointsDelta?: number; bonusDelta?: number; monetaryValue?: number; reason: string; reference?: string; createdBy?: string | null; idempotencyKey: string; metadata?: Record<string, unknown> }) {
  const inserted = await tx.insert(rewardLedger).values({ id: generateId(), organizationId: input.organizationId, customerId: input.customerId, rewardAccountId: input.accountId, branchId: input.branchId ?? null, saleId: input.saleId ?? null, salesReturnId: input.salesReturnId ?? null, type: input.type, pointsDelta: input.pointsDelta ?? 0, bonusDelta: String(input.bonusDelta ?? 0), monetaryValue: input.monetaryValue == null ? null : String(input.monetaryValue), reason: input.reason, reference: input.reference ?? null, createdBy: input.createdBy ?? null, idempotencyKey: input.idempotencyKey, metadata: input.metadata ?? {} }).onConflictDoNothing({ target: [rewardLedger.organizationId, rewardLedger.idempotencyKey] }).returning({ id: rewardLedger.id })
  return inserted.length === 1
}

export async function applySaleRewards(tx: RewardTransaction, input: { organizationId: string; customerId: string; branchId: string; saleId: string; userId: string; lines: RewardSaleLine[]; ordinaryDiscount: number; pointsToRedeem?: number; bonusToUse?: number; paymentRequestId?: string }) {
  const settings = await getRewardSettings(input.organizationId, tx)
  const account = await ensureRewardAccount(tx, input.organizationId, input.customerId)
  const loyaltyLines = await eligibleLines(tx, settings, input.branchId, 'loyalty', input.lines)
  const bonusLines = await eligibleLines(tx, settings, input.branchId, 'bonus', input.lines)
  const loyaltyEligibleGross = money(loyaltyLines.reduce((sum, line) => sum + line.eligibleAmount, 0))
  const bonusEligibleGross = money(bonusLines.reduce((sum, line) => sum + line.eligibleAmount, 0))
  const discountShare = input.lines.reduce((sum, line) => sum + line.amount, 0) > 0 ? Math.min(1, input.ordinaryDiscount / input.lines.reduce((sum, line) => sum + line.amount, 0)) : 0
  const loyaltyEligible = money(loyaltyEligibleGross * (settings.discountedItemsEarnPoints ? 1 : 1 - discountShare))
  const requestedPoints = Math.max(0, Math.trunc(input.pointsToRedeem ?? 0))
  const requestedBonus = money(Math.max(0, input.bonusToUse ?? 0))
  const [reservation] = input.paymentRequestId ? await tx.select().from(rewardReservation).where(and(eq(rewardReservation.paymentRequestId, input.paymentRequestId), eq(rewardReservation.organizationId, input.organizationId))).limit(1).for('update') : []
  if (reservation && (reservation.status !== 'ACTIVE' || reservation.expiresAt <= new Date())) throw new Error('The reward reservation expired; reconcile this payment manually')
  if (reservation && (reservation.pointsReserved !== requestedPoints || Number(reservation.bonusReserved) !== requestedBonus)) throw new Error('Reward reservation does not match the checkout')
  if (requestedPoints && requestedBonus && !settings.allowPointsWithBonus) throw new Error('Loyalty points and bonus cannot be combined')
  const [otherReservations] = await tx.select({ points: sql<number>`coalesce(sum(${rewardReservation.pointsReserved}),0)`, bonus: sql<string>`coalesce(sum(${rewardReservation.bonusReserved}),0)` }).from(rewardReservation).where(and(eq(rewardReservation.rewardAccountId, account.id), eq(rewardReservation.status, 'ACTIVE'), sql`${rewardReservation.expiresAt} > now()`, input.paymentRequestId ? sql`${rewardReservation.paymentRequestId} <> ${input.paymentRequestId}` : undefined))
  const availablePoints = Math.max(0, account.pointsBalance - Number(otherReservations?.points ?? 0))
  const availableBonus = money(Math.max(0, Number(account.bonusBalance) - Number(otherReservations?.bonus ?? 0)))
  const maxPoints = calculateMaxPointsRedemption(availablePoints, loyaltyEligible, settings)
  if (requestedPoints > maxPoints.points) throw new Error(requestedPoints > availablePoints ? 'Not enough available points' : 'Points redemption exceeds the allowed limit')
  const pointsValue = money(requestedPoints * settings.pointValue)
  const maxBonus = calculateMaxBonusRedemption(availableBonus, bonusEligibleGross, settings)
  if (requestedBonus > maxBonus) throw new Error(requestedBonus > availableBonus ? 'Available bonus balance is insufficient' : 'Bonus redemption exceeds the allowed limit')
  let earningSpend = loyaltyEligible
  if (!settings.loyaltyPaidAmountEarnsPoints) earningSpend = money(earningSpend - pointsValue)
  if (!settings.bonusPaidAmountEarnsPoints) earningSpend = money(earningSpend - requestedBonus)
  earningSpend = Math.max(0, earningSpend)
  const pointsEarned = calculatePointsEarned(earningSpend, settings)
  const earnedAfterDebt = applyPositivePointsToDebt(pointsEarned, account.pointsDebt)
  const nextPointsBalance = account.pointsBalance - requestedPoints + earnedAfterDebt.balanceIncrease
  const nextBonusBalance = money(Number(account.bonusBalance) - requestedBonus)
  await tx.update(customerRewardAccount).set({ pointsBalance: nextPointsBalance, pointsDebt: earnedAfterDebt.debtAfter, bonusBalance: String(nextBonusBalance), lifetimePointsEarned: account.lifetimePointsEarned + pointsEarned, lifetimePointsRedeemed: account.lifetimePointsRedeemed + requestedPoints, lifetimeBonusRedeemed: String(money(Number(account.lifetimeBonusRedeemed) + requestedBonus)), updatedAt: new Date() }).where(eq(customerRewardAccount.id, account.id))
  if (requestedPoints) await addLedger(tx, { organizationId: input.organizationId, customerId: input.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'POINTS_REDEEMED', pointsDelta: -requestedPoints, monetaryValue: pointsValue, reason: 'Redeemed on sale', reference: input.saleId, createdBy: input.userId, idempotencyKey: `sale:${input.saleId}:points-redeem` })
  if (requestedBonus) await addLedger(tx, { organizationId: input.organizationId, customerId: input.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'BONUS_REDEEMED', bonusDelta: -requestedBonus, monetaryValue: requestedBonus, reason: 'Bonus used on sale', reference: input.saleId, createdBy: input.userId, idempotencyKey: `sale:${input.saleId}:bonus-redeem` })
  if (pointsEarned) await addLedger(tx, { organizationId: input.organizationId, customerId: input.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'POINTS_EARNED', pointsDelta: pointsEarned, monetaryValue: money(pointsEarned * settings.pointValue), reason: 'Earned from completed sale', reference: input.saleId, idempotencyKey: `sale:${input.saleId}:earn`, metadata: { debtRepaid: earnedAfterDebt.debtPaid } })
  if (reservation) await tx.update(rewardReservation).set({ status: 'CONSUMED', consumedAt: new Date(), updatedAt: new Date() }).where(eq(rewardReservation.id, reservation.id))
  return { settings, loyaltyEligible, bonusEligible: bonusEligibleGross, pointsRedeemed: requestedPoints, loyaltyRedemptionValue: pointsValue, bonusRedeemed: requestedBonus, pointsEarned, externalAmountReduction: money(pointsValue + requestedBonus), lineEligibility: new Map(loyaltyLines.map((line) => [line.productId, line.eligibleAmount])) }
}

export async function reserveRewardsForPayment(tx: RewardTransaction, input: { organizationId: string; customerId: string; branchId: string; paymentRequestId: string; expiresAt: Date; lines: RewardSaleLine[]; ordinaryDiscount: number; pointsToRedeem?: number; bonusToUse?: number }) {
  const requestedPoints = Math.max(0, Math.trunc(input.pointsToRedeem ?? 0))
  const requestedBonus = money(Math.max(0, input.bonusToUse ?? 0))
  if (!requestedPoints && !requestedBonus) return { externalAmountReduction: 0 }
  const settings = await getRewardSettings(input.organizationId, tx)
  const account = await ensureRewardAccount(tx, input.organizationId, input.customerId)
  const loyaltyLines = await eligibleLines(tx, settings, input.branchId, 'loyalty', input.lines)
  const bonusLines = await eligibleLines(tx, settings, input.branchId, 'bonus', input.lines)
  const gross = money(input.lines.reduce((sum, line) => sum + line.amount, 0))
  const discountShare = gross > 0 ? Math.min(1, input.ordinaryDiscount / gross) : 0
  const loyaltyEligible = money(loyaltyLines.reduce((sum, line) => sum + line.eligibleAmount, 0) * (settings.discountedItemsEarnPoints ? 1 : 1 - discountShare))
  const bonusEligible = money(bonusLines.reduce((sum, line) => sum + line.eligibleAmount, 0))
  const [reserved] = await tx.select({ points: sql<number>`coalesce(sum(${rewardReservation.pointsReserved}),0)`, bonus: sql<string>`coalesce(sum(${rewardReservation.bonusReserved}),0)` }).from(rewardReservation).where(and(eq(rewardReservation.rewardAccountId, account.id), eq(rewardReservation.status, 'ACTIVE'), sql`${rewardReservation.expiresAt} > now()`))
  const availablePoints = Math.max(0, account.pointsBalance - Number(reserved?.points ?? 0))
  const availableBonus = money(Math.max(0, Number(account.bonusBalance) - Number(reserved?.bonus ?? 0)))
  if (requestedPoints && requestedBonus && !settings.allowPointsWithBonus) throw new Error('Loyalty points and bonus cannot be combined')
  const maxPoints = calculateMaxPointsRedemption(availablePoints, loyaltyEligible, settings)
  if (requestedPoints > maxPoints.points) throw new Error('Requested points are unavailable or exceed the redemption limit')
  const maxBonus = calculateMaxBonusRedemption(availableBonus, bonusEligible, settings)
  if (requestedBonus > maxBonus) throw new Error('Requested bonus is unavailable or exceeds the redemption limit')
  const pointsValue = money(requestedPoints * settings.pointValue)
  await tx.insert(rewardReservation).values({ id: generateId(), organizationId: input.organizationId, customerId: input.customerId, rewardAccountId: account.id, paymentRequestId: input.paymentRequestId, pointsReserved: requestedPoints, pointsValueReserved: String(pointsValue), bonusReserved: String(requestedBonus), expiresAt: input.expiresAt })
  return { externalAmountReduction: money(pointsValue + requestedBonus) }
}

export async function reverseRewardsForReturn(tx: RewardTransaction, input: { organizationId: string; saleId: string; returnId: string; branchId: string; userId: string; returnedEligibleSpend: number }) {
  const [original] = await tx.select().from(sale).where(and(eq(sale.id, input.saleId), eq(sale.orgId, input.organizationId))).limit(1)
  if (!original?.customerId || Number(original.rewardEligibleSpend) <= 0) return { pointsEarnedReversed: 0, pointsRedeemedRestored: 0, bonusRestored: 0 }
  const [already] = await tx.select({ id: salesReturn.id }).from(salesReturn).where(and(eq(salesReturn.id, input.returnId), sql`${salesReturn.rewardEffectsAppliedAt} is not null`)).limit(1)
  if (already) return { pointsEarnedReversed: 0, pointsRedeemedRestored: 0, bonusRestored: 0 }
  const prior = await tx.select({ eligible: sql<string>`coalesce(sum(${salesReturn.rewardEligibleSpendReversed}),0)`, earned: sql<number>`coalesce(sum(${salesReturn.pointsEarnedReversed}),0)`, restored: sql<number>`coalesce(sum(${salesReturn.pointsRedeemedRestored}),0)`, bonus: sql<string>`coalesce(sum(${salesReturn.bonusRestored}),0)` }).from(salesReturn).where(and(eq(salesReturn.saleId, input.saleId), eq(salesReturn.orgId, input.organizationId), sql`${salesReturn.rewardEffectsAppliedAt} is not null`))
  const cumulativeRatio = Math.min(1, (Number(prior[0]?.eligible ?? 0) + input.returnedEligibleSpend) / Number(original.rewardEligibleSpend))
  const pointsEarnedReversed = Math.max(0, Math.floor(original.loyaltyPointsEarned * cumulativeRatio) - Number(prior[0]?.earned ?? 0))
  const pointsRedeemedRestored = Math.max(0, Math.floor(original.loyaltyPointsRedeemed * cumulativeRatio) - Number(prior[0]?.restored ?? 0))
  const bonusRestored = money(Math.max(0, money(Number(original.bonusRedeemed) * cumulativeRatio) - Number(prior[0]?.bonus ?? 0)))
  const account = await ensureRewardAccount(tx, input.organizationId, original.customerId)
  const reversed = reversePointsWithDebt(account.pointsBalance, account.pointsDebt, pointsEarnedReversed)
  const restored = applyPositivePointsToDebt(pointsRedeemedRestored, reversed.debtAfter)
  const bonusCredit = applyPositiveBonusToDebt(bonusRestored, Number(account.bonusDebt))
  await tx.update(customerRewardAccount).set({ pointsBalance: reversed.balanceAfter + restored.balanceIncrease, pointsDebt: restored.debtAfter, bonusBalance: String(money(Number(account.bonusBalance) + bonusCredit.balanceIncrease)), bonusDebt: String(bonusCredit.debtAfter), updatedAt: new Date() }).where(eq(customerRewardAccount.id, account.id))
  if (pointsEarnedReversed) await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, salesReturnId: input.returnId, type: 'POINTS_REVERSED', pointsDelta: -pointsEarnedReversed, reason: 'Reversed for returned eligible items', reference: input.returnId, createdBy: input.userId, idempotencyKey: `return:${input.returnId}:earned-reversal`, metadata: { debtAdded: reversed.debtAdded } })
  if (pointsRedeemedRestored) await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, salesReturnId: input.returnId, type: 'POINTS_REVERSED', pointsDelta: pointsRedeemedRestored, monetaryValue: money(pointsRedeemedRestored * Number(original.rewardPointValueSnapshot ?? 0)), reason: 'Restored redeemed points for return', reference: input.returnId, createdBy: input.userId, idempotencyKey: `return:${input.returnId}:points-restoration`, metadata: { debtRepaid: restored.debtPaid } })
  if (bonusRestored) await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, salesReturnId: input.returnId, type: 'BONUS_REVERSED', bonusDelta: bonusRestored, monetaryValue: bonusRestored, reason: 'Restored bonus for return', reference: input.returnId, createdBy: input.userId, idempotencyKey: `return:${input.returnId}:bonus-restoration`, metadata: { debtRepaid: bonusCredit.debtPaid } })
  return { pointsEarnedReversed, pointsRedeemedRestored, bonusRestored }
}

export async function reverseRewardsForVoid(tx: RewardTransaction, input: { organizationId: string; saleId: string; branchId: string; userId: string }) {
  const [original] = await tx.select().from(sale).where(and(eq(sale.id, input.saleId), eq(sale.orgId, input.organizationId))).limit(1)
  if (!original?.customerId || (!original.loyaltyPointsEarned && !original.loyaltyPointsRedeemed && Number(original.bonusRedeemed) === 0)) return { reversed: false }
  const account = await ensureRewardAccount(tx, input.organizationId, original.customerId)
  const reversed = reversePointsWithDebt(account.pointsBalance, account.pointsDebt, original.loyaltyPointsEarned)
  const restored = applyPositivePointsToDebt(original.loyaltyPointsRedeemed, reversed.debtAfter)
  const bonusRestored = Number(original.bonusRedeemed)
  const bonusCredit = applyPositiveBonusToDebt(bonusRestored, Number(account.bonusDebt))
  const marker = await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'POINTS_REVERSED', pointsDelta: -original.loyaltyPointsEarned, reason: 'Rewards reversed for voided sale', reference: input.saleId, createdBy: input.userId, idempotencyKey: `void:${input.saleId}:reward-reversal`, metadata: { pointsDebtAdded: reversed.debtAdded } })
  if (!marker) return { reversed: false }
  await tx.update(customerRewardAccount).set({ pointsBalance: reversed.balanceAfter + restored.balanceIncrease, pointsDebt: restored.debtAfter, bonusBalance: String(money(Number(account.bonusBalance) + bonusCredit.balanceIncrease)), bonusDebt: String(bonusCredit.debtAfter), updatedAt: new Date() }).where(eq(customerRewardAccount.id, account.id))
  if (original.loyaltyPointsRedeemed) await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'POINTS_REVERSED', pointsDelta: original.loyaltyPointsRedeemed, monetaryValue: Number(original.loyaltyRedemptionValue), reason: 'Redeemed points restored for voided sale', reference: input.saleId, createdBy: input.userId, idempotencyKey: `void:${input.saleId}:points-restoration`, metadata: { debtRepaid: restored.debtPaid } })
  if (bonusRestored) await addLedger(tx, { organizationId: input.organizationId, customerId: original.customerId, accountId: account.id, branchId: input.branchId, saleId: input.saleId, type: 'BONUS_REVERSED', bonusDelta: bonusRestored, monetaryValue: bonusRestored, reason: 'Bonus restored for voided sale', reference: input.saleId, createdBy: input.userId, idempotencyKey: `void:${input.saleId}:bonus-restoration`, metadata: { debtRepaid: bonusCredit.debtPaid } })
  return { reversed: true }
}

export async function updateRewardSettings(input: Partial<Omit<RewardSettingsModel, 'id' | 'organizationId'>>) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_SETTINGS)
  const numeric = [input.spendPerPoint, input.pointValue, input.minimumEligibleSpend, input.maximumPointsRedemptionPercent, input.maximumBonusRedemptionPercent].filter((value): value is number => value !== undefined)
  if (numeric.some((value) => !Number.isFinite(value) || value < 0) || (input.spendPerPoint !== undefined && input.spendPerPoint <= 0) || (input.pointValue !== undefined && input.pointValue <= 0)) throw new Error('Invalid reward settings')
  if ((input.maximumPointsRedemptionPercent ?? 0) > 100 || (input.maximumBonusRedemptionPercent ?? 0) > 100) throw new Error('Reward percentages cannot exceed 100')
  if (input.minimumRedemptionPoints !== undefined && (!Number.isInteger(input.minimumRedemptionPoints) || input.minimumRedemptionPoints < 0)) throw new Error('Invalid minimum redemption points')
  const current = await getRewardSettings(authorization.organizationId)
  await db.update(rewardSettings).set({
    ...(input.loyaltyEnabled !== undefined && { loyaltyEnabled: input.loyaltyEnabled }),
    ...(input.spendPerPoint !== undefined && { spendPerPoint: String(input.spendPerPoint) }),
    ...(input.pointValue !== undefined && { pointValue: String(input.pointValue) }),
    ...(input.minimumRedemptionPoints !== undefined && { minimumRedemptionPoints: input.minimumRedemptionPoints }),
    ...(input.maximumPointsRedemptionPercent !== undefined && { maximumPointsRedemptionPercent: String(input.maximumPointsRedemptionPercent) }),
    ...(input.minimumEligibleSpend !== undefined && { minimumEligibleSpend: String(input.minimumEligibleSpend) }),
    ...(input.pointsExpiryDays !== undefined && { pointsExpiryDays: input.pointsExpiryDays }),
    ...(input.bonusEnabled !== undefined && { bonusEnabled: input.bonusEnabled }),
    ...(input.maximumBonusRedemptionPercent !== undefined && { maximumBonusRedemptionPercent: String(input.maximumBonusRedemptionPercent) }),
    ...(input.allowPointsWithBonus !== undefined && { allowPointsWithBonus: input.allowPointsWithBonus }),
    ...(input.discountedItemsEarnPoints !== undefined && { discountedItemsEarnPoints: input.discountedItemsEarnPoints }),
    ...(input.bonusPaidAmountEarnsPoints !== undefined && { bonusPaidAmountEarnsPoints: input.bonusPaidAmountEarnsPoints }),
    ...(input.loyaltyPaidAmountEarnsPoints !== undefined && { loyaltyPaidAmountEarnsPoints: input.loyaltyPaidAmountEarnsPoints }),
    ...(input.roundingMode !== undefined && { roundingMode: input.roundingMode }), updatedAt: new Date(),
  }).where(eq(rewardSettings.id, current.id))
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'reward_settings_updated', metadata: { changes: input } })
}

export async function adjustCustomerRewards(input: { customerId: string; kind: 'points' | 'bonus'; direction: 'add' | 'remove'; amount: number; reason: string; reference?: string }) {
  const authorization = await requirePermission(PermissionEnum.REWARDS_ADJUST)
  if (!input.reason.trim() || input.reason.trim().length < 3) throw new Error('Enter a reason for this adjustment')
  if (!Number.isFinite(input.amount) || input.amount <= 0 || (input.kind === 'points' && !Number.isInteger(input.amount))) throw new Error('Enter a valid adjustment amount')
  const adjustmentId = generateId()
  return db.transaction(async (tx) => {
    const account = await ensureRewardAccount(tx, authorization.organizationId, input.customerId)
    if (input.kind === 'points') {
      if (input.direction === 'remove' && input.amount > account.pointsBalance) throw new Error('Cannot remove more than the available points')
      const positive = input.direction === 'add' ? applyPositivePointsToDebt(input.amount, account.pointsDebt) : null
      await tx.update(customerRewardAccount).set({ pointsBalance: input.direction === 'add' ? account.pointsBalance + positive!.balanceIncrease : account.pointsBalance - input.amount, pointsDebt: positive?.debtAfter ?? account.pointsDebt, updatedAt: new Date() }).where(eq(customerRewardAccount.id, account.id))
      await addLedger(tx, { organizationId: authorization.organizationId, customerId: input.customerId, accountId: account.id, type: 'POINTS_ADJUSTED', pointsDelta: input.direction === 'add' ? input.amount : -input.amount, reason: input.reason.trim(), reference: input.reference, createdBy: authorization.userId, idempotencyKey: `adjustment:${adjustmentId}`, metadata: { debtRepaid: positive?.debtPaid ?? 0 } })
    } else {
      const amount = money(input.amount)
      if (input.direction === 'remove' && amount > Number(account.bonusBalance)) throw new Error('Cannot remove more than the available bonus')
      const positive = input.direction === 'add' ? applyPositiveBonusToDebt(amount, Number(account.bonusDebt)) : null
      await tx.update(customerRewardAccount).set({ bonusBalance: String(input.direction === 'add' ? money(Number(account.bonusBalance) + positive!.balanceIncrease) : money(Number(account.bonusBalance) - amount)), bonusDebt: String(positive?.debtAfter ?? account.bonusDebt), lifetimeBonusCredited: String(input.direction === 'add' ? money(Number(account.lifetimeBonusCredited) + amount) : account.lifetimeBonusCredited), updatedAt: new Date() }).where(eq(customerRewardAccount.id, account.id))
      await addLedger(tx, { organizationId: authorization.organizationId, customerId: input.customerId, accountId: account.id, type: 'BONUS_ADJUSTED', bonusDelta: input.direction === 'add' ? amount : -amount, monetaryValue: amount, reason: input.reason.trim(), reference: input.reference, createdBy: authorization.userId, idempotencyKey: `adjustment:${adjustmentId}`, metadata: { debtRepaid: positive?.debtPaid ?? 0 } })
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'customer_rewards_adjusted', metadata: { adjustmentId, customerId: input.customerId, kind: input.kind, direction: input.direction, amount: input.amount, reason: input.reason.trim() } })
    return { adjustmentId }
  })
}
