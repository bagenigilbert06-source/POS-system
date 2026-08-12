ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "roundingAmount" numeric(12, 2) DEFAULT '0' NOT NULL;
