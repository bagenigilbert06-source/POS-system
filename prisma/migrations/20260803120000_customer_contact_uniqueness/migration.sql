-- Prevent duplicate customer contacts within a workspace, including concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS "customer_org_email_unique"
  ON "customer" ("orgId", lower("email"))
  WHERE "email" IS NOT NULL AND btrim("email") <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "customer_org_phone_unique"
  ON "customer" ("orgId", regexp_replace("phone", '[^0-9+]', '', 'g'))
  WHERE "phone" IS NOT NULL AND btrim("phone") <> '';
