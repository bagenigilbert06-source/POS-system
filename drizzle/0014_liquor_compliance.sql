ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "isBanned" boolean NOT NULL DEFAULT false;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "bannedAt" timestamp;

CREATE TABLE IF NOT EXISTS "age_verification_log" (
  "id" text PRIMARY KEY NOT NULL,
  "transactionId" text REFERENCES "sale"("id") ON DELETE SET NULL,
  "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "customerId" text REFERENCES "customer"("id") ON DELETE SET NULL,
  "method" text NOT NULL DEFAULT 'manual',
  "dob" timestamp,
  "idReference" text,
  "verified" boolean NOT NULL DEFAULT true,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "age_verification_log_org_idx" ON "age_verification_log" ("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "age_verification_log_transaction_idx" ON "age_verification_log" ("transactionId");

CREATE TABLE IF NOT EXISTS "compliance_license" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "licenseNumber" text NOT NULL,
  "issuingAuthority" text NOT NULL,
  "issueDate" timestamp NOT NULL,
  "expiryDate" timestamp NOT NULL,
  "documentUrl" text,
  "status" text NOT NULL DEFAULT 'active',
  "notes" text,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "compliance_license_org_idx" ON "compliance_license" ("orgId", "expiryDate");
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_license_org_number_unique" ON "compliance_license" ("orgId", "licenseNumber");

CREATE TABLE IF NOT EXISTS "alcohol_sale_hours" (
  "id" text PRIMARY KEY NOT NULL,
  "dayOfWeek" integer NOT NULL,
  "startTime" text NOT NULL,
  "endTime" text NOT NULL,
  "enforcement" text NOT NULL DEFAULT 'block',
  "enabled" boolean NOT NULL DEFAULT true,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "updatedBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "alcohol_sale_hours_org_day_unique" ON "alcohol_sale_hours" ("orgId", "dayOfWeek");
