ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "posSessionId" text;
CREATE INDEX IF NOT EXISTS "sale_branch_idx" ON "sale" ("branchId");
CREATE INDEX IF NOT EXISTS "sale_pos_session_idx" ON "sale" ("posSessionId");

ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "posSessionId" text;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "customerId" text;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "checkoutPayload" json;
CREATE INDEX IF NOT EXISTS "mpesa_payment_request_match_idx" ON "mpesa_payment_request" ("organizationId", "branchId", "paymentMode", "status", "amount", "createdAt");

ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "organizationId" text;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "mpesa_incoming_payment" ADD COLUMN IF NOT EXISTS "transactionAt" timestamp;
CREATE INDEX IF NOT EXISTS "mpesa_incoming_payment_org_branch_idx" ON "mpesa_incoming_payment" ("organizationId", "branchId", "status", "createdAt");

UPDATE "mpesa_payment_request" SET "status" = CASE "status"
  WHEN 'initiating' THEN 'SENDING_STK'
  WHEN 'pending' THEN 'AWAITING_CUSTOMER'
  WHEN 'success' THEN 'CONFIRMED'
  WHEN 'failed' THEN 'FAILED'
  WHEN 'timeout' THEN 'EXPIRED'
  ELSE "status" END;
UPDATE "mpesa_payment_request" SET "status" = 'AWAITING_CONFIRMATION'
WHERE "status" = 'AWAITING_CUSTOMER' AND "paymentMode" IN ('paybill', 'till');
UPDATE "mpesa_incoming_payment" SET "status" = CASE "status"
  WHEN 'matched' THEN 'MATCHED'
  WHEN 'unmatched' THEN 'UNMATCHED'
  ELSE "status" END;

CREATE TABLE IF NOT EXISTS "mpesa_business_account" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "branchId" text NOT NULL,
  "shortcode" text NOT NULL,
  "accountType" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_business_account_shortcode_unique" ON "mpesa_business_account" ("shortcode");
CREATE INDEX IF NOT EXISTS "mpesa_business_account_org_idx" ON "mpesa_business_account" ("organizationId");
