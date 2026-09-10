ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptLayout" text DEFAULT 'thermal' NOT NULL;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptTemplate" text DEFAULT 'classic' NOT NULL;
