-- Normalize the live category/product names. Historical snapshot fields such as
-- saleItem.productName and inventory movement productName are intentionally not
-- rewritten: they describe what was recorded at the time of the transaction.
BEGIN;

UPDATE "category"
SET "name" = 'Wine', "slug" = 'wine', "updatedAt" = NOW()
WHERE lower("name") = 'whine';

UPDATE "category"
SET "name" = 'Red wine', "slug" = 'red-wine', "updatedAt" = NOW()
WHERE lower("name") = 'red whine';

UPDATE "product"
SET "name" = 'Wine', "updatedAt" = NOW()
WHERE lower("name") = 'whine';

COMMIT;
