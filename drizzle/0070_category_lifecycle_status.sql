-- Align category lifecycle state with the application schema.
-- Existing rows are intentionally backfilled to the schema's documented default.
ALTER TABLE "category"
  ADD COLUMN IF NOT EXISTS "lifecycleStatus" text NOT NULL DEFAULT 'DRAFT';
