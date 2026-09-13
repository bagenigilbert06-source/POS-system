-- Forward-only correction for merchant values embedded by legacy migrations.
-- Clear only the exact known defaults; explicitly customized rows are untouched.
UPDATE "mpesa_merchant_configuration"
SET "tillNumber" = NULL, "headOfficeNumber" = NULL, "storeNumber" = NULL,
    "manualTillEnabled" = false, "stkEnabled" = false, "updatedAt" = now()
WHERE "businessName" = 'R T LIQUEUR BARRELS CO. LIMITED'
  AND "tillNumber" = '1704604'
  AND "headOfficeNumber" = '1233942'
  AND "storeNumber" = '1233943';

ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'SAFARICOM_DARAJA' NOT NULL;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "eventType" text DEFAULT 'C2B_CONFIRMATION' NOT NULL;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "processingStatus" text DEFAULT 'RECEIVED' NOT NULL;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "reconciliationStatus" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "reconciliationReason" text;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "processedAt" timestamp;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "failureCode" text;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "failureMessage" text;

CREATE UNIQUE INDEX IF NOT EXISTS "sale_payment_mpesa_reference_unique"
  ON "sale_payment" ("reference") WHERE "method" = 'mpesa' AND "status" = 'completed' AND "reference" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "sale_mpesa_ref_unique"
  ON "sale" ("mpesaRef") WHERE "mpesaRef" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_incoming_payment_matched_request_unique"
  ON "mpesa_incoming_payment" ("matchedRequestId") WHERE "matchedRequestId" IS NOT NULL;
