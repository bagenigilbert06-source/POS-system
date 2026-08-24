ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'online';
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "provisionalReceiptNo" text;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "offlineCreatedAt" timestamp;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "syncedAt" timestamp;

CREATE TABLE IF NOT EXISTS "offline_sale_sync" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "sessionId" text NOT NULL REFERENCES "pos_session"("id") ON DELETE RESTRICT,
  "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "saleId" text REFERENCES "sale"("id") ON DELETE RESTRICT,
  "idempotencyKey" text NOT NULL,
  "provisionalReceiptNo" text NOT NULL,
  "payloadHash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" integer NOT NULL DEFAULT 0,
  "offlineCreatedAt" timestamp NOT NULL,
  "firstReceivedAt" timestamp NOT NULL DEFAULT now(),
  "lastAttemptAt" timestamp,
  "syncedAt" timestamp,
  "errorCode" text,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "offline_sale_sync_org_idempotency_unique"
  ON "offline_sale_sync" ("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "offline_sale_sync_org_provisional_unique"
  ON "offline_sale_sync" ("organizationId", "provisionalReceiptNo");
CREATE INDEX IF NOT EXISTS "offline_sale_sync_org_status_idx"
  ON "offline_sale_sync" ("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "offline_sale_sync_session_status_idx"
  ON "offline_sale_sync" ("sessionId", "status");
