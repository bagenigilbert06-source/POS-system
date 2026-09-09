-- Unknown supplier cost is distinct from a verified zero cost.
ALTER TABLE "product" ALTER COLUMN "buyingPrice" DROP NOT NULL;
ALTER TABLE "product" ALTER COLUMN "buyingPrice" DROP DEFAULT;
