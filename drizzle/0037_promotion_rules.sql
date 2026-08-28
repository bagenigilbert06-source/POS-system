-- Promotions pages query this table through Drizzle.  Keep this migration in
-- the Drizzle migration stream used by the application (rather than only in
-- prisma/migrations) so new and existing databases receive the table.
CREATE TABLE IF NOT EXISTS "promotion_rule" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "kind" text NOT NULL,
  "valueType" text DEFAULT 'percentage' NOT NULL,
  "value" numeric(12,2) NOT NULL,
  "minimumSpend" numeric(12,2) DEFAULT '0' NOT NULL,
  "maximumDiscount" numeric(12,2),
  "usageLimit" integer,
  "usedCount" integer DEFAULT 0 NOT NULL,
  "startsAt" timestamp NOT NULL,
  "endsAt" timestamp NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "promotion_rule_kind_check" CHECK ("kind" IN ('coupon', 'discount', 'bonus')),
  CONSTRAINT "promotion_rule_value_type_check" CHECK ("valueType" IN ('percentage', 'fixed')),
  CONSTRAINT "promotion_rule_value_check" CHECK ("value" > 0),
  CONSTRAINT "promotion_rule_dates_check" CHECK ("endsAt" > "startsAt")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promotion_rule_org_code_unique" ON "promotion_rule" ("organizationId", "code");
CREATE INDEX IF NOT EXISTS "promotion_rule_org_kind_idx" ON "promotion_rule" ("organizationId", "kind");
