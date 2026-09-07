ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "kraOscuApprovalStatus" text NOT NULL DEFAULT 'PENDING';
ALTER TABLE "etims_configuration" ADD COLUMN IF NOT EXISTS "kraOscuApprovedAt" timestamp;
