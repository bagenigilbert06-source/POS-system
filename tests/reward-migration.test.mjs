import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../drizzle/0033_customer_rewards.sql', import.meta.url), 'utf8')
for (const table of ['reward_settings', 'customer_reward_account', 'reward_ledger', 'reward_reservation']) {
  assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS "${table}"`))
}
const safeDefaults = readFileSync(new URL('../drizzle/0049_safe_loyalty_defaults.sql', import.meta.url), 'utf8')
assert.match(safeDefaults, /SET DEFAULT '25'/)
assert.match(safeDefaults, /WHERE "maximumPointsRedemptionPercent" = '50'/)
assert.match(sql, /Migrated legacy loyalty balance/)
assert.match(sql, /ON CONFLICT \("organizationId","idempotencyKey"\) DO NOTHING/)
assert.match(sql, /reward_ledger_immutable/)
assert.match(sql, /"pointsDebt" integer DEFAULT 0 NOT NULL/)
assert.match(sql, /"rewardEligibleAmount" numeric\(12,2\)/)

console.log('Reward migration contract test passed')
