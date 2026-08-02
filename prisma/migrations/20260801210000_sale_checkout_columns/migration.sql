-- Bring existing sale records in line with the checkout schema.
-- Nullable fields preserve all historical transactions.
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "amountReceived" numeric(12,2);
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "change" numeric(12,2);
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
CREATE UNIQUE INDEX IF NOT EXISTS "sale_org_idempotency_key_unique"
  ON "sale"("orgId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;
