ALTER TABLE "promotion_rule" ADD COLUMN IF NOT EXISTS "lifecycleStatus" text NOT NULL DEFAULT 'DRAFT';
UPDATE "promotion_rule" SET "lifecycleStatus" = CASE WHEN "isActive" THEN CASE WHEN now() < "startsAt" THEN 'SCHEDULED' WHEN now() > "endsAt" THEN 'ENDED' ELSE 'ACTIVE' END ELSE 'PAUSED' END;
