-- This column was introduced by the legacy Prisma migration
-- 20260804150000_receipt_logo, but was never represented in Drizzle history.
-- The conditional form is intentional: older databases may already have the
-- column while a fresh Drizzle database must receive it before invoice setup.
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "receiptLogoUrl" text;
