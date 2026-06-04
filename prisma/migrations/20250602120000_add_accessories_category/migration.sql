DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'აქსესუარები', 'aksesuarebi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'aksesuarebi'
    );
  END IF;
END $$;
