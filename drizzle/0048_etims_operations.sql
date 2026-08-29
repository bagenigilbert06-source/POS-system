ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "connectionStatus" text NOT NULL DEFAULT 'NOT_CONFIGURED';
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastConnectionTestAt" timestamp;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastConnectionSuccessAt" timestamp;
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "lastConnectionMessage" text;

CREATE TABLE IF NOT EXISTS "etims_submission_attempt" (
  "id" text PRIMARY KEY,
  "submissionId" text NOT NULL REFERENCES "etims_submission"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "attemptNumber" integer NOT NULL,
  "trigger" text NOT NULL,
  "status" text NOT NULL,
  "resultCode" text,
  "resultMessage" text,
  "startedAt" timestamp NOT NULL,
  "completedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "etims_attempt_submission_number_unique" ON "etims_submission_attempt" ("submissionId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "etims_attempt_org_created_idx" ON "etims_submission_attempt" ("organizationId", "completedAt");
CREATE INDEX IF NOT EXISTS "etims_submission_receipt_lookup_idx" ON "etims_submission" ("organizationId", "branchId", "createdAt");
