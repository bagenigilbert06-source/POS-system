CREATE TABLE IF NOT EXISTS "reward_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "loyaltyEnabled" boolean DEFAULT true NOT NULL,
  "spendPerPoint" numeric(12,2) DEFAULT '100' NOT NULL,
  "pointValue" numeric(12,2) DEFAULT '1' NOT NULL,
  "minimumRedemptionPoints" integer DEFAULT 100 NOT NULL,
  "maximumPointsRedemptionPercent" numeric(5,2) DEFAULT '50' NOT NULL,
  "minimumEligibleSpend" numeric(12,2) DEFAULT '0' NOT NULL,
  "pointsExpiryDays" integer,
  "bonusEnabled" boolean DEFAULT true NOT NULL,
  "maximumBonusRedemptionPercent" numeric(5,2) DEFAULT '100' NOT NULL,
  "allowPointsWithBonus" boolean DEFAULT true NOT NULL,
  "discountedItemsEarnPoints" boolean DEFAULT true NOT NULL,
  "bonusPaidAmountEarnsPoints" boolean DEFAULT false NOT NULL,
  "loyaltyPaidAmountEarnsPoints" boolean DEFAULT false NOT NULL,
  "roundingMode" text DEFAULT 'floor' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reward_settings_org_unique" UNIQUE("organizationId"),
  CONSTRAINT "reward_settings_positive_rates" CHECK ("spendPerPoint" > 0 AND "pointValue" > 0),
  CONSTRAINT "reward_settings_valid_percentages" CHECK ("maximumPointsRedemptionPercent" BETWEEN 0 AND 100 AND "maximumBonusRedemptionPercent" BETWEEN 0 AND 100),
  CONSTRAINT "reward_settings_valid_rounding" CHECK ("roundingMode" IN ('floor','nearest','ceil'))
);

CREATE TABLE IF NOT EXISTS "reward_branch_eligibility" (
  "id" text PRIMARY KEY NOT NULL,
  "rewardSettingsId" text NOT NULL REFERENCES "reward_settings"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "rewardKind" text NOT NULL,
  CONSTRAINT "reward_branch_eligibility_unique" UNIQUE("rewardSettingsId","branchId","rewardKind"),
  CONSTRAINT "reward_branch_kind_valid" CHECK ("rewardKind" IN ('loyalty','bonus'))
);

CREATE TABLE IF NOT EXISTS "reward_category_eligibility" (
  "id" text PRIMARY KEY NOT NULL,
  "rewardSettingsId" text NOT NULL REFERENCES "reward_settings"("id") ON DELETE CASCADE,
  "categoryId" text NOT NULL REFERENCES "category"("id") ON DELETE CASCADE,
  "rewardKind" text NOT NULL,
  "mode" text NOT NULL,
  CONSTRAINT "reward_category_eligibility_unique" UNIQUE("rewardSettingsId","categoryId","rewardKind"),
  CONSTRAINT "reward_category_kind_valid" CHECK ("rewardKind" IN ('loyalty','bonus')),
  CONSTRAINT "reward_category_mode_valid" CHECK ("mode" IN ('include','exclude'))
);

CREATE TABLE IF NOT EXISTS "reward_product_eligibility" (
  "id" text PRIMARY KEY NOT NULL,
  "rewardSettingsId" text NOT NULL REFERENCES "reward_settings"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "rewardKind" text NOT NULL,
  "mode" text NOT NULL,
  CONSTRAINT "reward_product_eligibility_unique" UNIQUE("rewardSettingsId","productId","rewardKind"),
  CONSTRAINT "reward_product_kind_valid" CHECK ("rewardKind" IN ('loyalty','bonus')),
  CONSTRAINT "reward_product_mode_valid" CHECK ("mode" IN ('include','exclude'))
);

CREATE TABLE IF NOT EXISTS "customer_reward_account" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "customerId" text NOT NULL REFERENCES "customer"("id") ON DELETE CASCADE,
  "pointsBalance" integer DEFAULT 0 NOT NULL,
  "pointsDebt" integer DEFAULT 0 NOT NULL,
  "bonusBalance" numeric(12,2) DEFAULT '0' NOT NULL,
  "bonusDebt" numeric(12,2) DEFAULT '0' NOT NULL,
  "lifetimePointsEarned" integer DEFAULT 0 NOT NULL,
  "lifetimePointsRedeemed" integer DEFAULT 0 NOT NULL,
  "lifetimeBonusCredited" numeric(12,2) DEFAULT '0' NOT NULL,
  "lifetimeBonusRedeemed" numeric(12,2) DEFAULT '0' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "customer_reward_account_customer_unique" UNIQUE("customerId"),
  CONSTRAINT "customer_reward_account_nonnegative" CHECK ("pointsBalance" >= 0 AND "pointsDebt" >= 0 AND "bonusBalance" >= 0 AND "bonusDebt" >= 0)
);

CREATE TABLE IF NOT EXISTS "reward_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "customerId" text NOT NULL REFERENCES "customer"("id") ON DELETE RESTRICT,
  "rewardAccountId" text NOT NULL REFERENCES "customer_reward_account"("id") ON DELETE RESTRICT,
  "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text REFERENCES "sale"("id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  "salesReturnId" text REFERENCES "sales_return"("id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  "campaignSource" text,
  "type" text NOT NULL,
  "pointsDelta" integer DEFAULT 0 NOT NULL,
  "bonusDelta" numeric(12,2) DEFAULT '0' NOT NULL,
  "monetaryValue" numeric(12,2),
  "reason" text NOT NULL,
  "reference" text,
  "createdBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "idempotencyKey" text NOT NULL,
  "metadata" json DEFAULT '{}'::json NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reward_ledger_org_idempotency_unique" UNIQUE("organizationId","idempotencyKey"),
  CONSTRAINT "reward_ledger_type_valid" CHECK ("type" IN ('POINTS_OPENING','POINTS_EARNED','POINTS_REDEEMED','POINTS_REVERSED','POINTS_ADJUSTED','POINTS_EXPIRED','BONUS_OPENING','BONUS_CREDITED','BONUS_REDEEMED','BONUS_REVERSED','BONUS_ADJUSTED','BONUS_EXPIRED'))
);

CREATE TABLE IF NOT EXISTS "reward_reservation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "customerId" text NOT NULL REFERENCES "customer"("id") ON DELETE RESTRICT,
  "rewardAccountId" text NOT NULL REFERENCES "customer_reward_account"("id") ON DELETE RESTRICT,
  "paymentRequestId" text NOT NULL REFERENCES "mpesa_payment_request"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  "pointsReserved" integer DEFAULT 0 NOT NULL,
  "pointsValueReserved" numeric(12,2) DEFAULT '0' NOT NULL,
  "bonusReserved" numeric(12,2) DEFAULT '0' NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "consumedAt" timestamp,
  "releasedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reward_reservation_payment_request_unique" UNIQUE("paymentRequestId"),
  CONSTRAINT "reward_reservation_nonnegative" CHECK ("pointsReserved" >= 0 AND "pointsValueReserved" >= 0 AND "bonusReserved" >= 0),
  CONSTRAINT "reward_reservation_status_valid" CHECK ("status" IN ('ACTIVE','CONSUMED','RELEASED','EXPIRED'))
);

CREATE INDEX IF NOT EXISTS "customer_reward_account_org_idx" ON "customer_reward_account" ("organizationId");
CREATE INDEX IF NOT EXISTS "reward_ledger_customer_created_idx" ON "reward_ledger" ("customerId","createdAt");
CREATE INDEX IF NOT EXISTS "reward_ledger_branch_created_idx" ON "reward_ledger" ("branchId","createdAt");
CREATE INDEX IF NOT EXISTS "reward_reservation_account_status_idx" ON "reward_reservation" ("rewardAccountId","status","expiresAt");

ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "loyaltyPointsEarned" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "loyaltyPointsRedeemed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "loyaltyRedemptionValue" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "bonusRedeemed" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "rewardEligibleSpend" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "rewardEarningRateSnapshot" numeric(12,2);
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "rewardPointValueSnapshot" numeric(12,2);
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "rewardEligibleAmount" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "pointsEarnedReversed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "pointsRedeemedRestored" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "bonusRestored" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "rewardEligibleSpendReversed" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "rewardEffectsAppliedAt" timestamp;

INSERT INTO "reward_settings" ("id","organizationId")
SELECT 'reward-settings-' || "id", "id" FROM "organization"
ON CONFLICT ("organizationId") DO NOTHING;

INSERT INTO "customer_reward_account" ("id","organizationId","customerId","pointsBalance","lifetimePointsEarned")
SELECT 'reward-account-' || "id", "orgId", "id", GREATEST("loyaltyPoints",0), GREATEST("loyaltyPoints",0)
FROM "customer"
ON CONFLICT ("customerId") DO NOTHING;

INSERT INTO "reward_ledger" ("id","organizationId","customerId","rewardAccountId","type","pointsDelta","reason","reference","idempotencyKey","metadata")
SELECT 'reward-opening-' || c."id", c."orgId", c."id", a."id", 'POINTS_OPENING', c."loyaltyPoints",
  'Migrated legacy loyalty balance', 'legacy:customer.loyaltyPoints', 'migration:0033:customer:' || c."id" || ':points-opening',
  json_build_object('legacyColumn','customer.loyaltyPoints')
FROM "customer" c JOIN "customer_reward_account" a ON a."customerId" = c."id"
WHERE c."loyaltyPoints" > 0
ON CONFLICT ("organizationId","idempotencyKey") DO NOTHING;

CREATE OR REPLACE FUNCTION prevent_reward_ledger_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'reward_ledger is immutable; create a compensating entry'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS reward_ledger_immutable ON "reward_ledger";
CREATE TRIGGER reward_ledger_immutable BEFORE UPDATE OR DELETE ON "reward_ledger"
FOR EACH ROW EXECUTE FUNCTION prevent_reward_ledger_mutation();
