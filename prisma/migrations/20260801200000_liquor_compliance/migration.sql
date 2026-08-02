-- Audit the mandatory age check for liquor-workspace sales.
-- Additive and safe for existing completed sales, which remain unverified historical records.
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "ageVerified" boolean NOT NULL DEFAULT false;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "ageVerifiedAt" timestamp;
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "ageVerifiedBy" text;
CREATE INDEX IF NOT EXISTS "sale_org_age_verified_idx" ON "sale"("orgId", "ageVerified", "createdAt");
