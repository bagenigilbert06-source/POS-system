CREATE TABLE IF NOT EXISTS "card_terminal" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "terminalCode" text NOT NULL,
  "provider" text,
  "referenceRequired" boolean DEFAULT false NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "card_terminal_org_code_unique" ON "card_terminal" ("organizationId", "terminalCode");
CREATE INDEX IF NOT EXISTS "card_terminal_branch_active_idx" ON "card_terminal" ("branchId", "isActive");

CREATE TABLE IF NOT EXISTS "card_payment_attempt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "posSessionId" text NOT NULL,
  "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "cardTerminalId" text NOT NULL REFERENCES "card_terminal"("id") ON DELETE RESTRICT,
  "amount" numeric(12,2) NOT NULL,
  "authorizationCode" text NOT NULL,
  "reference" text,
  "cardBrand" text,
  "last4" text,
  "entryMode" text,
  "status" text DEFAULT 'approved_pending_sale' NOT NULL,
  "saleId" text,
  "idempotencyKey" text NOT NULL,
  "recoveredAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "card_attempt_status_check" CHECK ("status" IN ('approved_pending_sale','completed','declined','reconciliation_required','reversed')),
  CONSTRAINT "card_attempt_last4_check" CHECK ("last4" IS NULL OR "last4" ~ '^[0-9]{4}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS "card_payment_attempt_org_idempotency_unique" ON "card_payment_attempt" ("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "card_payment_attempt_terminal_created_idx" ON "card_payment_attempt" ("cardTerminalId", "createdAt");
CREATE INDEX IF NOT EXISTS "card_payment_attempt_status_idx" ON "card_payment_attempt" ("organizationId", "status");

ALTER TABLE "sale_payment" ADD COLUMN IF NOT EXISTS "cardTerminalId" text REFERENCES "card_terminal"("id") ON DELETE RESTRICT;
ALTER TABLE "sale_payment" ADD COLUMN IF NOT EXISTS "authorizationCode" text;
ALTER TABLE "sale_payment" ADD COLUMN IF NOT EXISTS "cardBrand" text;
ALTER TABLE "sale_payment" ADD COLUMN IF NOT EXISTS "cardLast4" text;
ALTER TABLE "sale_payment" ADD COLUMN IF NOT EXISTS "cardEntryMode" text;
