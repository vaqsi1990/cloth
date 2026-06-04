-- Add SUPPORT only when UserRole already exists (runs before baseline on fresh DBs).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPPORT'
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'SUPPORT';
    END IF;
  END IF;
END $$;
