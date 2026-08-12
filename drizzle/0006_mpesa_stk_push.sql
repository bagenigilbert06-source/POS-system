CREATE TABLE IF NOT EXISTS "mpesa_payment_request" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "phone" text NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "merchantRequestId" text,
  "checkoutRequestId" text,
  "receiptNumber" text,
  "resultCode" text,
  "resultDescription" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "saleId" text,
  "callbackPayload" json,
  "expiresAt" timestamp NOT NULL,
  "completedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "mpesa_payment_request_org_idx" ON "mpesa_payment_request" USING btree ("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_payment_request_checkout_unique" ON "mpesa_payment_request" USING btree ("checkoutRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_payment_request_receipt_unique" ON "mpesa_payment_request" USING btree ("receiptNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_payment_request_org_idempotency_unique" ON "mpesa_payment_request" USING btree ("organizationId", "idempotencyKey");
