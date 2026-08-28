-- Keep inventory-loss records attributable to the terminal where they were
-- entered. This column already exists in the Drizzle schema but was omitted
-- from the earlier terminal-attribution migration.
ALTER TABLE "inventory_loss"
  ADD COLUMN IF NOT EXISTS "terminalId" text
  REFERENCES "pos_terminal"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "inventory_loss_org_terminal_created_idx"
  ON "inventory_loss" ("orgId", "terminalId", "createdAt");
