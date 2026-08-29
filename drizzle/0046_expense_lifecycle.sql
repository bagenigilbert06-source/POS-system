ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "expenseNo" text;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "payee" text;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "financialAccountId" text REFERENCES "financial_account"("id") ON DELETE RESTRICT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "cashMovementId" text REFERENCES "cash_movement"("id") ON DELETE RESTRICT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'effective';
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "approvalId" text REFERENCES "finance_approval"("id") ON DELETE RESTRICT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "voidReason" text;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "voidedAt" timestamp;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "voidedBy" text REFERENCES "user"("id") ON DELETE RESTRICT;

UPDATE "expense"
SET "expenseNo" = 'EXP-LEGACY-' || "id", "status" = COALESCE("status", 'effective')
WHERE "expenseNo" IS NULL;

ALTER TABLE "expense" ALTER COLUMN "expenseNo" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "expense_org_number_unique" ON "expense" ("orgId", "expenseNo");
CREATE UNIQUE INDEX IF NOT EXISTS "expense_org_idempotency_unique" ON "expense" ("orgId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "expense_org_status_date_idx" ON "expense" ("orgId", "status", "expenseDate");
CREATE INDEX IF NOT EXISTS "expense_financial_account_idx" ON "expense" ("financialAccountId", "expenseDate");

CREATE TABLE IF NOT EXISTS "expense_number_sequence" (
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "year" integer NOT NULL,
  "lastNumber" integer NOT NULL DEFAULT 0,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "expense_number_sequence_org_year_unique" ON "expense_number_sequence" ("organizationId", "year");
