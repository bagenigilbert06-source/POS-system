ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastStatusCheckAt" timestamp;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastSuccessfulStatusCheckAt" timestamp;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "activatedAt" timestamp;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "providerStatus" text;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "providerReference" text;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastProviderErrorCode" text;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastProviderErrorMessage" text;
