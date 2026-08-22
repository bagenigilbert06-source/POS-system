ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "countedCash" numeric(12,2);
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "countedVariance" numeric(12,2);
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "countedAt" timestamp;
