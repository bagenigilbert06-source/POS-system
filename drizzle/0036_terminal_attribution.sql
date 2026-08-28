-- Immutable physical-register attribution for new POS activity. Existing rows
-- are backfilled only where their historical shift identifies a terminal.
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT;
ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT;
ALTER TABLE "cash_movement" ADD COLUMN IF NOT EXISTS "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT;

UPDATE "sale" s SET "terminalId" = ps."terminalId"
FROM "pos_session" ps WHERE s."posSessionId" = ps."id" AND s."terminalId" IS NULL AND ps."terminalId" IS NOT NULL;
UPDATE "sales_return" r SET "terminalId" = ps."terminalId"
FROM "pos_session" ps WHERE r."posSessionId" = ps."id" AND r."terminalId" IS NULL AND ps."terminalId" IS NOT NULL;
UPDATE "cash_movement" m SET "terminalId" = ps."terminalId"
FROM "pos_session" ps WHERE m."sessionId" = ps."id" AND m."terminalId" IS NULL AND ps."terminalId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "sale_org_terminal_created_idx" ON "sale" ("orgId", "terminalId", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_return_org_terminal_created_idx" ON "sales_return" ("orgId", "terminalId", "createdAt");
CREATE INDEX IF NOT EXISTS "cash_movement_org_terminal_created_idx" ON "cash_movement" ("orgId", "terminalId", "createdAt");
