-- Additive onboarding foundation. Existing organizations and workspace data are preserved.
CREATE TABLE IF NOT EXISTS "organization_membership" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "onboarding_state" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "organizationId" text UNIQUE REFERENCES "organization"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'not_started',
  "currentStep" text NOT NULL DEFAULT 'welcome',
  "completedSteps" json NOT NULL DEFAULT '[]'::json,
  "data" json NOT NULL DEFAULT '{}'::json,
  "configurationVersion" integer NOT NULL DEFAULT 1,
  "startedAt" timestamp NOT NULL DEFAULT now(),
  "lastSavedAt" timestamp NOT NULL DEFAULT now(),
  "completedAt" timestamp
);

CREATE TABLE IF NOT EXISTS "branch" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "address" text,
  "region" text,
  "city" text,
  "timezone" text NOT NULL DEFAULT 'Africa/Nairobi',
  "receiptHeader" text,
  "isMain" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "branch_org_code_unique" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "branch_organization_idx" ON "branch" ("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "branch_one_main_per_org" ON "branch" ("organizationId") WHERE "isMain" = true;

CREATE TABLE IF NOT EXISTS "branch_membership" (
  "id" text PRIMARY KEY,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'staff',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "branch_membership_branch_user_unique" UNIQUE ("branchId", "userId")
);

CREATE TABLE IF NOT EXISTS "business_settings" (
  "organizationId" text PRIMARY KEY REFERENCES "organization"("id") ON DELETE CASCADE,
  "displayName" text,
  "website" text,
  "region" text,
  "city" text,
  "address" text,
  "language" text NOT NULL DEFAULT 'en',
  "financialYearStart" text,
  "operations" json NOT NULL DEFAULT '{}'::json,
  "enabledModules" json NOT NULL DEFAULT '[]'::json,
  "paymentMethods" json NOT NULL DEFAULT '[]'::json,
  "defaultPaymentMethod" text,
  "taxEnabled" boolean NOT NULL DEFAULT false,
  "pricesIncludeTax" boolean NOT NULL DEFAULT false,
  "taxName" text,
  "taxRate" numeric(5,2) NOT NULL DEFAULT 0,
  "taxIdentifier" text,
  "receiptBusinessName" text,
  "receiptPhone" text,
  "receiptAddress" text,
  "receiptFooter" text,
  "showTaxOnReceipt" boolean NOT NULL DEFAULT false,
  "receiptNumbering" text NOT NULL DEFAULT 'automatic',
  "checklistDismissed" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_event" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "action" text NOT NULL,
  "metadata" json NOT NULL DEFAULT '{}'::json,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_event_organization_idx" ON "audit_event" ("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_membership_org_user_unique"
  ON "organization_membership" ("organizationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_owner_unique" ON "organization" ("userId");

-- Public API roles cannot read onboarding or tenant configuration directly.
ALTER TABLE "onboarding_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_event" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "onboarding_state", "organization_membership", "branch", "branch_membership", "business_settings", "audit_event" FROM anon, authenticated;
