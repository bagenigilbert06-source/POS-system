CREATE TABLE IF NOT EXISTS "staff_attendance" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "workDate" text NOT NULL,
  "clockInAt" timestamp NOT NULL,
  "clockOutAt" timestamp,
  "status" text NOT NULL DEFAULT 'working',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_active_user_unique" ON "staff_attendance" ("organizationId", "userId") WHERE "clockOutAt" IS NULL;
CREATE INDEX IF NOT EXISTS "staff_attendance_org_date_idx" ON "staff_attendance" ("organizationId", "workDate");
CREATE INDEX IF NOT EXISTS "staff_attendance_user_date_idx" ON "staff_attendance" ("userId", "workDate");
CREATE TABLE IF NOT EXISTS "staff_attendance_break" (
  "id" text PRIMARY KEY NOT NULL,
  "attendanceId" text NOT NULL REFERENCES "staff_attendance"("id") ON DELETE CASCADE,
  "startedAt" timestamp NOT NULL,
  "endedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "staff_attendance_audit" (
  "id" text PRIMARY KEY NOT NULL,
  "attendanceId" text NOT NULL REFERENCES "staff_attendance"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "managerId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "originalValue" json NOT NULL,
  "correctedValue" json NOT NULL,
  "reason" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_break_active_unique" ON "staff_attendance_break" ("attendanceId") WHERE "endedAt" IS NULL;
