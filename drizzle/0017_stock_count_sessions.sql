-- Proper physical stock-count sessions. Existing adjustments remain valid;
-- the new nullable fields only enrich records created through the session flow.
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "countName" text;
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "assignedTo" text;
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "startedAt" timestamp;
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "completedAt" timestamp;

ALTER TABLE "stock_adjustment_item" ADD COLUMN IF NOT EXISTS "countedAt" timestamp;
ALTER TABLE "stock_adjustment_item" ADD COLUMN IF NOT EXISTS "countedBy" text;
ALTER TABLE "stock_adjustment_item" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE INDEX IF NOT EXISTS "stock_adjustment_org_status_idx"
  ON "stock_adjustment" ("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_adjustment_item_session_counted_idx"
  ON "stock_adjustment_item" ("adjustmentId", "countedAt");
