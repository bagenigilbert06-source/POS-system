ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "receiptLayout" text NOT NULL DEFAULT 'detailed';
