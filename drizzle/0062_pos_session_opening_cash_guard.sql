DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_session_opening_cash_nonnegative'
  ) THEN
    ALTER TABLE "pos_session"
      ADD CONSTRAINT "pos_session_opening_cash_nonnegative" CHECK ("openingCash" >= 0);
  END IF;
END $$;
