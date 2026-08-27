ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(12, 2) DEFAULT '0' NOT NULL;
