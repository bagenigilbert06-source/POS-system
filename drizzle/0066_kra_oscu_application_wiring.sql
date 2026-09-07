ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsItemClassificationCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsItemTypeCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsOriginCountryCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsPackagingUnitCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsQuantityUnitCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsRegistrationStatus" text NOT NULL DEFAULT 'NOT_REGISTERED';
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsRegisteredAt" timestamp;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsLastValidatedAt" timestamp;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsLastErrorCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsLastErrorMessage" text;

ALTER TABLE "etims_submission" ADD COLUMN IF NOT EXISTS "providerInvoiceNumber" integer;
ALTER TABLE "etims_submission" ADD COLUMN IF NOT EXISTS "fiscalSnapshot" json;
ALTER TABLE "etims_credit_note" ADD COLUMN IF NOT EXISTS "providerInvoiceNumber" integer;
CREATE UNIQUE INDEX IF NOT EXISTS "etims_submission_provider_invoice_unique" ON "etims_submission" ("organizationId", "branchId", "provider", "environment", "providerInvoiceNumber");

CREATE TABLE IF NOT EXISTS "etims_invoice_sequence" (
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "environment" text NOT NULL,
  "nextNumber" integer NOT NULL DEFAULT 1,
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "etims_invoice_sequence_pk" PRIMARY KEY ("organizationId", "branchId", "provider", "environment")
);

CREATE TABLE IF NOT EXISTS "etims_branch_secret" (
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "environment" text NOT NULL,
  "secretName" text NOT NULL,
  "ciphertext" text NOT NULL,
  "iv" text NOT NULL,
  "authTag" text NOT NULL,
  "keyVersion" integer NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "etims_branch_secret_pk" PRIMARY KEY ("organizationId", "branchId", "provider", "environment", "secretName")
);

CREATE TABLE IF NOT EXISTS "etims_provider_code" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "environment" text NOT NULL,
  "codeType" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "active" boolean NOT NULL DEFAULT true,
  "providerUpdatedAt" timestamp,
  "lastRequestedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "etims_provider_code_unique" ON "etims_provider_code" ("organizationId", "branchId", "provider", "environment", "codeType", "code");
CREATE INDEX IF NOT EXISTS "etims_provider_code_lookup_idx" ON "etims_provider_code" ("organizationId", "branchId", "codeType", "active");
