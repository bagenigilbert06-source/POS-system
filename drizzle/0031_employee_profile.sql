ALTER TABLE "employee"
ADD COLUMN IF NOT EXISTS "profile" json NOT NULL DEFAULT '{}'::json;
