ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "feedbackQrEnabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "feedback_invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "businessNameSnapshot" text NOT NULL,
  "branchNameSnapshot" text NOT NULL,
  "status" text NOT NULL DEFAULT 'OPEN',
  "respondedAt" timestamp,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_invitation_token_unique" ON "feedback_invitation" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_invitation_sale_unique" ON "feedback_invitation" ("saleId");
CREATE INDEX IF NOT EXISTS "feedback_invitation_org_branch_idx" ON "feedback_invitation" ("organizationId", "branchId");

CREATE TABLE IF NOT EXISTS "customer_feedback" (
  "id" text PRIMARY KEY NOT NULL,
  "invitationId" text NOT NULL REFERENCES "feedback_invitation"("id") ON DELETE cascade,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE cascade,
  "score" integer NOT NULL,
  "category" text NOT NULL,
  "tags" json NOT NULL DEFAULT '[]'::json,
  "comment" text,
  "submittedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_feedback_invitation_unique" ON "customer_feedback" ("invitationId");
CREATE INDEX IF NOT EXISTS "customer_feedback_org_branch_idx" ON "customer_feedback" ("organizationId", "branchId");
