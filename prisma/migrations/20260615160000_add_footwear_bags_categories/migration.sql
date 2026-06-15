DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქალის ფეხსაცმელი', 'women-footwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'women-footwear'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქალის ჩანთა', 'women-bags', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'women-bags'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'კაცის ფეხსაცმელი', 'men-footwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'men-footwear'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'კაცის ჩანთა', 'men-bags', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'men-bags'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბავშვის ფეხსაცმელი', 'kids-footwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'kids-footwear'
    );

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბავშვის ჩანთა', 'kids-bags', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM "Category" WHERE "slug" = 'kids-bags'
    );
  END IF;
END $$;
