DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    UPDATE "Category"
    SET "name" = 'ფეხსაცმელი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'men-footwear';

    UPDATE "Category"
    SET "name" = 'ჩანთა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'men-bags';

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'პალტოები& მოსასხამი', 'men-coats', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-coats');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სადღესასწაულო კოსტუმი', 'men-festive-costume', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-festive-costume');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბლუზა', 'men-blouse', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-blouse');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქოსფლეის კოსტუმი', 'men-cosplay', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-cosplay');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საღამური პერანგი', 'evening-shirt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'evening-shirt');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სვიტერი', 'sweater', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'sweater');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შორტი', 'shorts', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'shorts');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'კომბინიზონი', 'jumpsuit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'jumpsuit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'პერანგი', 'shirt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'shirt');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შარვალი', 'men-pants', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-pants');
  END IF;
END $$;
