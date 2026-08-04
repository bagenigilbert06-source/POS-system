ALTER TABLE "business_settings"
  ALTER COLUMN "receiptLayout" SET DEFAULT 'thermal';

UPDATE "business_settings"
  SET "receiptLayout" = 'thermal'
  WHERE "receiptLayout" = 'detailed';
