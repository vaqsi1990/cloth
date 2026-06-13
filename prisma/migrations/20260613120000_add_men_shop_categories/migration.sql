DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ტრადიციული და კულტურული ტანსაცმელი', 'traditional-cultural', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'traditional-cultural'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სათხილამურო ტანსაცმელი', 'ski-wear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'ski-wear'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სათხილამურო სათვალე', 'ski-goggles', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'ski-goggles'
    );
  END IF;
END $$;
