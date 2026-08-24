ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsItemCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsUnitCode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsTaxCategory" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsTaxRate" numeric(5,2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "etimsVatClassification" text;

ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "kraPin" text;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "customerType" text NOT NULL DEFAULT 'individual';
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "vatRegistered" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "etims_configuration" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "enabled" boolean NOT NULL DEFAULT false,
  "environment" text NOT NULL DEFAULT 'sandbox',
  "integrationMethod" text NOT NULL DEFAULT 'OSCU',
  "providerName" text NOT NULL DEFAULT 'mock',
  "businessKraPin" text,
  "vatRegistered" boolean NOT NULL DEFAULT false,
  "externalBranchId" text,
  "deviceId" text,
  "apiBaseUrl" text,
  "credentialReference" text,
  "clientId" text,
  "clientSecretReference" text,
  "certificateReference" text,
  "privateKeyReference" text,
  "tokenConfiguration" json NOT NULL DEFAULT '{}',
  "invoiceSubmissionEnabled" boolean NOT NULL DEFAULT true,
  "automaticRetryEnabled" boolean NOT NULL DEFAULT true,
  "maximumRetryAttempts" integer NOT NULL DEFAULT 5,
  "receiptDetailsEnabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "etims_configuration_org_branch_unique" ON "etims_configuration" ("organizationId", "branchId");
CREATE INDEX IF NOT EXISTS "etims_configuration_org_idx" ON "etims_configuration" ("organizationId");

CREATE TABLE IF NOT EXISTS "etims_submission" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE RESTRICT,
  "configurationId" text NOT NULL REFERENCES "etims_configuration"("id") ON DELETE RESTRICT,
  "status" text NOT NULL DEFAULT 'PENDING',
  "provider" text NOT NULL,
  "environment" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "invoiceNumber" text,
  "internalReference" text,
  "controlNumber" text,
  "receiptNumber" text,
  "providerSubmissionId" text,
  "qrData" text,
  "verificationData" text,
  "requestData" json,
  "responseData" json,
  "submittedAt" timestamp,
  "acceptedAt" timestamp,
  "lastAttemptAt" timestamp,
  "nextRetryAt" timestamp,
  "retryCount" integer NOT NULL DEFAULT 0,
  "errorCode" text,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "etims_submission_sale_unique" ON "etims_submission" ("saleId");
CREATE UNIQUE INDEX IF NOT EXISTS "etims_submission_idempotency_unique" ON "etims_submission" ("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "etims_submission_retry_idx" ON "etims_submission" ("status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "etims_submission_org_status_created_idx" ON "etims_submission" ("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "etims_submission_branch_created_idx" ON "etims_submission" ("branchId", "createdAt");

CREATE TABLE IF NOT EXISTS "etims_credit_note" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE RESTRICT,
  "returnId" text NOT NULL REFERENCES "sales_return"("id") ON DELETE RESTRICT,
  "originalSubmissionId" text NOT NULL REFERENCES "etims_submission"("id") ON DELETE RESTRICT,
  "status" text NOT NULL DEFAULT 'PENDING',
  "provider" text NOT NULL,
  "environment" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "providerSubmissionId" text,
  "creditNoteNumber" text,
  "requestData" json,
  "responseData" json,
  "retryCount" integer NOT NULL DEFAULT 0,
  "lastAttemptAt" timestamp,
  "nextRetryAt" timestamp,
  "acceptedAt" timestamp,
  "errorCode" text,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "etims_credit_note_return_unique" ON "etims_credit_note" ("returnId");
CREATE UNIQUE INDEX IF NOT EXISTS "etims_credit_note_idempotency_unique" ON "etims_credit_note" ("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "etims_credit_note_retry_idx" ON "etims_credit_note" ("status", "nextRetryAt");
