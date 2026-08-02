ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "parentCategoryId" text;
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true;
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

UPDATE "category"
SET "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr("id", 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "category" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "category_org_slug_unique" ON "category" ("orgId", "slug");
CREATE INDEX IF NOT EXISTS "category_org_parent_idx" ON "category" ("orgId", "parentCategoryId");

INSERT INTO "category" ("id", "name", "slug", "description", "parentCategoryId", "isActive", "userId", "orgId", "createdAt", "updatedAt")
SELECT 'uncategorised-' || p."orgId", 'Uncategorised', 'uncategorised', 'System category for legacy products without a valid category.', NULL, true, min(p."userId"), p."orgId", now(), now()
FROM "product" p
LEFT JOIN "category" c ON c."id" = p."categoryId" AND c."orgId" = p."orgId"
WHERE p."categoryId" IS NULL OR c."id" IS NULL
GROUP BY p."orgId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "product" p
SET "categoryId" = 'uncategorised-' || p."orgId"
WHERE p."categoryId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "category" c WHERE c."id" = p."categoryId" AND c."orgId" = p."orgId");

DO $$ BEGIN
  ALTER TABLE "category" ADD CONSTRAINT "category_parent_category_fk" FOREIGN KEY ("parentCategoryId") REFERENCES "category"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "category" ("id", "name", "slug", "description", "isActive", "userId", "orgId", "createdAt", "updatedAt")
SELECT 'system-uncategorised-' || o."id", 'Uncategorised', 'uncategorised', 'System category for products awaiting classification.', true, o."userId", o."id", now(), now()
FROM "organization" o
WHERE NOT EXISTS (SELECT 1 FROM "category" c WHERE c."orgId" = o."id" AND c."slug" = 'uncategorised');

UPDATE "product" p
SET "categoryId" = 'system-uncategorised-' || p."orgId"
WHERE p."categoryId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "category" c WHERE c."id" = p."categoryId" AND c."orgId" = p."orgId");
