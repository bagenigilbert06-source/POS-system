CREATE TABLE IF NOT EXISTS "age_verification" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "terminalId" text REFERENCES "pos_terminal"("id") ON DELETE RESTRICT,
  "saleId" text REFERENCES "sale"("id") ON DELETE RESTRICT,
  "checkoutId" text NOT NULL,
  "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "status" text NOT NULL,
  "idType" text,
  "idReferenceMasked" text,
  "verifiedAt" timestamp,
  "cancelledAt" timestamp,
  "overrideReason" text,
  "overrideApprovedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "overrideApprovedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "age_verification_sale_idx" ON "age_verification" ("saleId");
CREATE INDEX IF NOT EXISTS "age_verification_checkout_idx" ON "age_verification" ("organizationId", "checkoutId");
CREATE INDEX IF NOT EXISTS "age_verification_org_created_idx" ON "age_verification" ("organizationId", "createdAt");
