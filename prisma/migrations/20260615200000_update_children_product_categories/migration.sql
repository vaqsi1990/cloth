DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    UPDATE "Category"
    SET "name" = 'კაბა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'kids-dresses';

    UPDATE "Category"
    SET "name" = 'ტრადიციული და კულტურული', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'kids-traditional';

    UPDATE "Category"
    SET "name" = 'სათხილამურო ტანსაცმელი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'kids-ski';

    UPDATE "Category"
    SET "name" = 'ფეხსაცმელი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'kids-footwear';

    UPDATE "Category"
    SET "name" = 'ჩანთა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'kids-bags';

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქვედაბოლო', 'kids-skirts', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-skirts');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'პალტოები& მოსასხამი', 'kids-coats', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-coats');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სადღესასწაულო კოსტუმი', 'kids-festive-costume', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-festive-costume');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბლუზა', 'kids-blouse', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-blouse');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქოსფლეის კოსტუმი', 'kids-cosplay', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-cosplay');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შარვალი', 'kids-pants', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-pants');
  END IF;
END $$;
