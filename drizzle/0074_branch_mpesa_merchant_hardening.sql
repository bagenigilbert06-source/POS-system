CREATE TABLE IF NOT EXISTS "mpesa_merchant_configuration" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "branchId" text NOT NULL,
  "businessName" text NOT NULL,
  "headOfficeNumber" text,
  "storeNumber" text,
  "tillNumber" text,
  "businessShortCode" text,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "stkEnabled" boolean DEFAULT false NOT NULL,
  "manualTillEnabled" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_merchant_configuration_branch_unique" ON "mpesa_merchant_configuration" ("branchId");
CREATE INDEX IF NOT EXISTS "mpesa_merchant_configuration_org_branch_idx" ON "mpesa_merchant_configuration" ("organizationId", "branchId");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_merchant_configuration_shortcode_unique" ON "mpesa_merchant_configuration" ("businessShortCode");

ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "merchantName" text;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "tillNumber" text;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "terminalId" text;

CREATE TABLE IF NOT EXISTS "mpesa_manual_recovery_audit" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "branchId" text NOT NULL,
  "terminalId" text,
  "cashierId" text NOT NULL,
  "managerId" text NOT NULL,
  "paymentRequestId" text NOT NULL,
  "saleId" text,
  "receiptNumber" text NOT NULL,
  "reason" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "mpesa_manual_recovery_audit_request_idx" ON "mpesa_manual_recovery_audit" ("paymentRequestId", "createdAt");

-- Configure only the known merchant metadata. Till 1704604 remains a Buy Goods Till,
-- deliberately leaving businessShortCode NULL and STK disabled until Safaricom supplies it.
INSERT INTO "mpesa_merchant_configuration" (
  "id", "organizationId", "branchId", "businessName", "headOfficeNumber", "storeNumber", "tillNumber", "environment", "stkEnabled", "manualTillEnabled"
)
SELECT
  'mpesa-rt-liquor-' || b."id", b."organizationId", b."id",
  'R T LIQUEUR BARRELS CO. LIMITED', '1233942', '1233943', '1704604', 'production', false, true
FROM "branch" b
JOIN "organization" o ON o."id" = b."organizationId"
WHERE upper(trim(o."name")) = 'R T LIQUEUR BARRELS CO. LIMITED'
ON CONFLICT ("branchId") DO UPDATE SET
  "businessName" = EXCLUDED."businessName", "headOfficeNumber" = EXCLUDED."headOfficeNumber",
  "storeNumber" = EXCLUDED."storeNumber", "tillNumber" = EXCLUDED."tillNumber",
  "environment" = EXCLUDED."environment", "stkEnabled" = false, "manualTillEnabled" = true,
  "updatedAt" = now();
