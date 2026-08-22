ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;

UPDATE "user" AS account
SET "phone" = staff."phone"
FROM "employee" AS staff
WHERE staff."userId" = account."id"
  AND account."phone" IS NULL
  AND staff."phone" IS NOT NULL;
