-- Normalize legacy department values while keeping the employee record intact.
-- Unknown, empty, and numeric values are intentionally flagged as unassigned
-- for an administrator to review instead of guessing their meaning.
UPDATE "employee"
SET "department" = CASE lower(trim(coalesce("department", '')))
  WHEN 'sales' THEN 'sales'
  WHEN 'operations' THEN 'operations'
  WHEN 'finance' THEN 'finance'
  WHEN 'support' THEN 'support'
  ELSE 'unassigned'
END
WHERE "department" IS NULL
   OR trim("department") = ''
   OR lower(trim("department")) NOT IN ('sales', 'operations', 'finance', 'support', 'unassigned');

ALTER TABLE "employee"
  ADD CONSTRAINT "employee_department_check"
  CHECK ("department" IN ('sales', 'operations', 'finance', 'support', 'unassigned'));
