ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "receiptShowShipping" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowCoupon" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowBonus" boolean NOT NULL DEFAULT true;
