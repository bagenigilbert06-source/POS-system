ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "paymentMode" text DEFAULT 'stk' NOT NULL;
ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "accountReference" text;
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_payment_request_account_reference_unique" ON "mpesa_payment_request" USING btree ("accountReference");

CREATE TABLE IF NOT EXISTS "mpesa_incoming_payment" (
  "id" text PRIMARY KEY NOT NULL,
  "transactionId" text NOT NULL,
  "shortcode" text NOT NULL,
  "accountReference" text,
  "phone" text,
  "payerName" text,
  "amount" numeric(12, 2) NOT NULL,
  "matchedRequestId" text,
  "status" text DEFAULT 'unmatched' NOT NULL,
  "payload" json,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_incoming_payment_transaction_unique" ON "mpesa_incoming_payment" USING btree ("transactionId");
CREATE INDEX IF NOT EXISTS "mpesa_incoming_payment_reference_idx" ON "mpesa_incoming_payment" USING btree ("accountReference");
