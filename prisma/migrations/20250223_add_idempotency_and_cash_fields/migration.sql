-- Add idempotency support and cash payment fields to sale table
-- This migration adds:
-- 1. idempotencyKey for duplicate prevention
-- 2. amountReceived for cash payment tracking
-- 3. change for cash payment tracking
-- 4. Unique index on (orgId, idempotencyKey) for idempotency

ALTER TABLE "sale" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "sale" ADD COLUMN "amountReceived" NUMERIC(12, 2);
ALTER TABLE "sale" ADD COLUMN "change" NUMERIC(12, 2);

-- Create unique index for idempotency (only on non-null keys)
CREATE UNIQUE INDEX "sale_idempotency_key" ON "sale"("orgId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Create index for faster lookups by orgId
CREATE INDEX "sale_orgId_idx" ON "sale"("orgId");
