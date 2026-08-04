ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "receiptTemplate" text NOT NULL DEFAULT 'classic';
