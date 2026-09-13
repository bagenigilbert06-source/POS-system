-- Durable leases and retry scheduling are required so callbacks can acknowledge
-- immediately while database-backed workers safely resume after a crash.
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "processingStartedAt" timestamp;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "nextRetryAt" timestamp;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "processingAttempts" integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "mpesa_incoming_payment_processing_idx"
  ON "mpesa_incoming_payment" ("processingStatus", "nextRetryAt", "createdAt");
