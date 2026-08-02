-- Staff management tables used by the dashboard checklist and staff module.
-- Additive and idempotent so existing tenant data is preserved.
CREATE TABLE IF NOT EXISTS "employee" (
  "id" text PRIMARY KEY,
  "userId" text REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "role" text NOT NULL DEFAULT 'staff',
  "department" text,
  "salary" numeric(12,2) NOT NULL DEFAULT 0,
  "joinDate" timestamp NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'active',
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "employee_org_idx" ON "employee"("orgId");

CREATE TABLE IF NOT EXISTS "shift" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "startTime" text NOT NULL,
  "endTime" text NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "shift_org_idx" ON "shift"("orgId");

CREATE TABLE IF NOT EXISTS "shift_assignment" (
  "id" text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES "employee"("id") ON DELETE CASCADE,
  "shiftId" text NOT NULL REFERENCES "shift"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "shift_assignment_org_idx" ON "shift_assignment"("orgId");
CREATE INDEX IF NOT EXISTS "shift_assignment_employee_idx" ON "shift_assignment"("employeeId");

CREATE TABLE IF NOT EXISTS "employee_commission" (
  "id" text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES "employee"("id") ON DELETE CASCADE,
  "amount" numeric(12,2) NOT NULL,
  "period" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "employee_commission_org_idx" ON "employee_commission"("orgId");
