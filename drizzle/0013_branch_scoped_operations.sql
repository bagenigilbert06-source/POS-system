ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_loss" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "expense_branch_idx" ON "expense" ("branchId");
CREATE INDEX IF NOT EXISTS "inventory_loss_branch_idx" ON "inventory_loss" ("branchId");
CREATE INDEX IF NOT EXISTS "pos_session_branch_idx" ON "pos_session" ("branchId");
