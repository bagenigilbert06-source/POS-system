ALTER TABLE "reward_settings"
  ALTER COLUMN "maximumPointsRedemptionPercent" SET DEFAULT '25';

-- Rows still carrying the original Pesaby default move to the safer default.
-- Custom percentages other than the former default remain untouched.
UPDATE "reward_settings"
SET "maximumPointsRedemptionPercent" = '25', "updatedAt" = now()
WHERE "maximumPointsRedemptionPercent" = '50';
