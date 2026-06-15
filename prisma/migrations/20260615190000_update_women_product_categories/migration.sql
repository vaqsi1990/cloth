DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    UPDATE "Category"
    SET "name" = 'კაბა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'dresses';

    UPDATE "Category"
    SET "name" = 'ბლუზა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'tops';

    UPDATE "Category"
    SET "name" = 'შარვალი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'pants';

    UPDATE "Category"
    SET "name" = 'ქვედაბოლო', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'skirts';

    UPDATE "Category"
    SET "name" = 'პალტოები& მოსასხამი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'coats';

    UPDATE "Category"
    SET "name" = 'საქორწინო კაბა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'wedding-dresses';

    UPDATE "Category"
    SET "name" = 'ქოსფლეის კოსტუმი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'cosplay';

    UPDATE "Category"
    SET "name" = 'სადღესასწაულო კოსტუმი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'festive';

    UPDATE "Category"
    SET "name" = 'ტრადიციული და კულტურული', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'traditional-cultural';

    UPDATE "Category"
    SET "name" = 'ფეხსაცმელი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'women-footwear';

    UPDATE "Category"
    SET "name" = 'ჩანთა', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'women-bags';
  END IF;
END $$;
