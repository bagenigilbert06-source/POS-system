ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "customBusinessCategory" text;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';

INSERT INTO "organization_membership" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT 'membership_' || md5(o.id || ':' || o."userId"), o.id, o."userId", 'owner', now(), now()
FROM "organization" o
ON CONFLICT ("organizationId", "userId") DO NOTHING;

INSERT INTO "branch_membership" ("id", "branchId", "userId", "role", "createdAt")
SELECT 'branch_membership_' || md5(b.id || ':' || o."userId"), b.id, o."userId", 'owner', now()
FROM "branch" b
JOIN "organization" o ON o.id = b."organizationId"
WHERE b."isMain" = true
ON CONFLICT ("branchId", "userId") DO NOTHING;
