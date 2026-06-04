DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბავშვების კალიასკა', 'bavshvebis-kaliaska', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'bavshvebis-kaliaska'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბავშვების სათამაშოები', 'bavshvebis-satamashoebi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'bavshvebis-satamashoebi'
    );
  END IF;
END $$;
