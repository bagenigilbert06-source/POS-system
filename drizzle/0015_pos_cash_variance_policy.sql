ALTER TABLE "business_settings"
ADD COLUMN IF NOT EXISTS "cashVarianceTolerance" numeric(12,2) NOT NULL DEFAULT 0;
