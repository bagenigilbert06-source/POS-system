ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "requiresAgeVerification" boolean;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "requiresAgeVerification" boolean;
