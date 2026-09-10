CREATE TABLE IF NOT EXISTS "staff_invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "employeeId" text NOT NULL REFERENCES "employee"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "userId" text REFERENCES "user"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'PENDING',
  "expiresAt" timestamp NOT NULL,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "acceptedAt" timestamp,
  "revokedAt" timestamp,
  "supersededAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "staff_invitation_org_idx" ON "staff_invitation" ("organizationId");
CREATE INDEX IF NOT EXISTS "staff_invitation_employee_idx" ON "staff_invitation" ("employeeId");
CREATE INDEX IF NOT EXISTS "staff_invitation_pending_idx" ON "staff_invitation" ("status", "expiresAt");
