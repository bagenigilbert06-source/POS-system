CREATE TABLE IF NOT EXISTS "suspended_sale" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT,
  "sessionId" text REFERENCES "pos_session"("id") ON DELETE RESTRICT,
  "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "customerId" text REFERENCES "customer"("id") ON DELETE SET NULL,
  "idempotencyKey" text NOT NULL,
  "status" text NOT NULL DEFAULT 'HELD',
  "items" json NOT NULL,
  "discountValue" numeric(12,2) NOT NULL DEFAULT 0,
  "discountType" text NOT NULL DEFAULT 'fixed',
  "subtotal" numeric(12,2) NOT NULL,
  "note" text,
  "expiresAt" timestamp NOT NULL,
  "resumedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "resumedTerminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT,
  "resumedAt" timestamp,
  "deletedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "deletedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "suspended_sale_org_idempotency_unique"
  ON "suspended_sale" ("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "suspended_sale_branch_status_created_idx"
  ON "suspended_sale" ("organizationId", "branchId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "suspended_sale_expiry_idx"
  ON "suspended_sale" ("status", "expiresAt");
