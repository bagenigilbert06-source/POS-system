-- Replace one-time UUID-shaped legacy labels with the same immutable reference
-- format used by new expenses. Numbering is scoped to organization and year.
WITH current_numbers AS (
  SELECT
    "orgId",
    (regexp_match("expenseNo", '^EXP-([0-9]{4})-'))[1]::integer AS year,
    max((regexp_match("expenseNo", '^EXP-[0-9]{4}-([0-9]{6})$'))[1]::integer) AS last_number
  FROM "expense"
  WHERE "expenseNo" ~ '^EXP-[0-9]{4}-[0-9]{6}$'
  GROUP BY "orgId", (regexp_match("expenseNo", '^EXP-([0-9]{4})-'))[1]::integer
), legacy AS (
  SELECT
    e."id",
    e."orgId",
    extract(year FROM e."expenseDate")::integer AS year,
    row_number() OVER (
      PARTITION BY e."orgId", extract(year FROM e."expenseDate")::integer
      ORDER BY e."expenseDate", e."createdAt", e."id"
    ) AS row_number
  FROM "expense" e
  WHERE e."expenseNo" LIKE 'EXP-LEGACY-%'
)
UPDATE "expense" e
SET "expenseNo" = 'EXP-' || legacy.year || '-' || lpad((coalesce(current_numbers.last_number, 0) + legacy.row_number)::text, 6, '0')
FROM legacy
LEFT JOIN current_numbers ON current_numbers."orgId" = legacy."orgId" AND current_numbers.year = legacy.year
WHERE e."id" = legacy."id";

INSERT INTO "expense_number_sequence" ("organizationId", "year", "lastNumber", "updatedAt")
SELECT
  "orgId",
  (regexp_match("expenseNo", '^EXP-([0-9]{4})-'))[1]::integer,
  max((regexp_match("expenseNo", '^EXP-[0-9]{4}-([0-9]{6})$'))[1]::integer),
  now()
FROM "expense"
WHERE "expenseNo" ~ '^EXP-[0-9]{4}-[0-9]{6}$'
GROUP BY "orgId", (regexp_match("expenseNo", '^EXP-([0-9]{4})-'))[1]::integer
ON CONFLICT ("organizationId", "year") DO UPDATE
SET "lastNumber" = greatest("expense_number_sequence"."lastNumber", excluded."lastNumber"),
    "updatedAt" = now();
