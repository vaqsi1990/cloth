DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შარვალ-კოსტიუმი', 'women-pants-suit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-pants-suit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ორეული', 'women-two-piece', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-two-piece');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოდე', 'women-bodysuit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-bodysuit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ტოპი', 'women-top', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-top');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'კორსეტი', 'women-corset', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-corset');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ტუფლები', 'women-shoes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-shoes');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სპორტული ფეხსაცმელი', 'women-sports-shoes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-sports-shoes');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტასი', 'women-boots', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-boots');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტები', 'women-booties', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-booties');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ნახევარბოტები', 'women-ankle-boots', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-ankle-boots');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სანდლები', 'women-sandals', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-sandals');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ჩუსტები', 'women-slippers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-slippers');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'მაღალქუსლიანი ფეხსაცმელი', 'women-high-heels', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-high-heels');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ლოფერები', 'women-loafers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-loafers');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბალეტკები', 'women-ballet-flats', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-ballet-flats');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შარვალ-კოსტიუმი', 'men-pants-suit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-pants-suit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ორეული', 'men-two-piece', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-two-piece');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სპორტული ფეხსაცმელი', 'men-sports-shoes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-sports-shoes');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტასი', 'men-boots', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-boots');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტები', 'men-booties', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-booties');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'კლასიკური ფეხსაცმელი', 'men-classic-shoes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-classic-shoes');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ლოფერები', 'men-loafers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-loafers');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სანდლები', 'men-sandals', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-sandals');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ჩუსტები', 'men-slippers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-slippers');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'შარვალ-კოსტიუმი', 'kids-pants-suit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-pants-suit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ორეული', 'kids-two-piece', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-two-piece');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სპორტული ფეხსაცმელი', 'kids-sports-shoes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-sports-shoes');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტასი', 'kids-boots', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-boots');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ბოტები', 'kids-booties', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-booties');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'სანდლები', 'kids-sandals', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-sandals');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ჩუსტები', 'kids-slippers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-slippers');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'რეზინის ჩექმები', 'kids-rubber-boots', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-rubber-boots');
  END IF;
END $$;
