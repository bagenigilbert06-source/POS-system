ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "varianceReason" text;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "reconciliationStartedAt" timestamp;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "closingSummary" json;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "pos_session_branch_status_idx" ON "pos_session" ("orgId", "branchId", "status");
CREATE INDEX IF NOT EXISTS "pos_session_terminal_status_idx" ON "pos_session" ("orgId", "terminalId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_session_active_terminal_unique" ON "pos_session" ("orgId", "terminalId") WHERE "terminalId" IS NOT NULL AND "status" IN ('open', 'closing');

ALTER TABLE "cash_movement" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "cash_movement" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "cash_movement" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
CREATE INDEX IF NOT EXISTS "cash_movement_session_idx" ON "cash_movement" ("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "cash_movement_org_idempotency_idx" ON "cash_movement" ("orgId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "posSessionId" text REFERENCES "pos_session"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "sales_return_session_idx" ON "sales_return" ("posSessionId");
