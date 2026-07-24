ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "receiptShowPhone" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowAddress" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowCashier" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowCustomer" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowPayment" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "receiptShowQrCode" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "receiptShowItemSku" boolean NOT NULL DEFAULT false;
