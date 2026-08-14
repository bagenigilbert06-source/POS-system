ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_loss" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;

-- Preserve historical records when branch scoping is introduced to an existing
-- organization. Prefer its main branch and fall back to its oldest branch.
UPDATE "expense" AS record
SET "branchId" = (
  SELECT location."id"
  FROM "branch" AS location
  WHERE location."organizationId" = record."orgId"
  ORDER BY location."isMain" DESC, location."createdAt" ASC
  LIMIT 1
)
WHERE record."branchId" IS NULL;

UPDATE "inventory_loss" AS record
SET "branchId" = (
  SELECT location."id"
  FROM "branch" AS location
  WHERE location."organizationId" = record."orgId"
  ORDER BY location."isMain" DESC, location."createdAt" ASC
  LIMIT 1
)
WHERE record."branchId" IS NULL;

UPDATE "pos_session" AS record
SET "branchId" = (
  SELECT location."id"
  FROM "branch" AS location
  WHERE location."organizationId" = record."orgId"
  ORDER BY location."isMain" DESC, location."createdAt" ASC
  LIMIT 1
)
WHERE record."branchId" IS NULL;

CREATE INDEX IF NOT EXISTS "expense_branch_idx" ON "expense" ("branchId");
CREATE INDEX IF NOT EXISTS "inventory_loss_branch_idx" ON "inventory_loss" ("branchId");
CREATE INDEX IF NOT EXISTS "pos_session_branch_idx" ON "pos_session" ("branchId");
