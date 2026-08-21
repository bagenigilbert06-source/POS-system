ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "paymentMethod" text NOT NULL DEFAULT 'cash';
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "expenseDate" timestamp;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

UPDATE "expense" SET "expenseDate" = "createdAt" WHERE "expenseDate" IS NULL;
ALTER TABLE "expense" ALTER COLUMN "expenseDate" SET DEFAULT now();
ALTER TABLE "expense" ALTER COLUMN "expenseDate" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "expense_org_date_idx" ON "expense" ("orgId", "expenseDate");
CREATE INDEX IF NOT EXISTS "expense_org_branch_date_idx" ON "expense" ("orgId", "branchId", "expenseDate");
