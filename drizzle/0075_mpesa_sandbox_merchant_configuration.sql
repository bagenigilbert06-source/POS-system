-- Customer-facing Buy Goods details remain branch configuration.  The Daraja
-- sandbox BusinessShortCode and credentials are server environment variables.
INSERT INTO "mpesa_merchant_configuration" (
  "id", "organizationId", "branchId", "businessName", "headOfficeNumber",
  "storeNumber", "tillNumber", "environment", "stkEnabled", "manualTillEnabled"
)
SELECT
  'mpesa-rt-liquor-' || b."id", b."organizationId", b."id",
  'R T LIQUEUR BARRELS CO. LIMITED', '1233942', '1233943', '1704604',
  'sandbox', true, true
FROM "branch" b
JOIN "organization" o ON o."id" = b."organizationId"
WHERE upper(trim(o."name")) = 'R T LIQUEUR BARRELS CO. LIMITED'
ON CONFLICT ("branchId") DO UPDATE SET
  "businessName" = EXCLUDED."businessName",
  "headOfficeNumber" = EXCLUDED."headOfficeNumber",
  "storeNumber" = EXCLUDED."storeNumber",
  "tillNumber" = EXCLUDED."tillNumber",
  "environment" = 'sandbox',
  "stkEnabled" = true,
  "manualTillEnabled" = true,
  "updatedAt" = now();
