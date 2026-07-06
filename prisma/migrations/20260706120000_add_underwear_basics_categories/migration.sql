DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ლიფი', 'women-bra', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-bra');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცვალი', 'women-underwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-underwear');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ლიფისა და საცვლის კომპლექტი', 'women-bra-underwear-set', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-bra-underwear-set');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ხალათი', 'women-nightgown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-nightgown');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'წინდები', 'women-socks', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-socks');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცურაო კოსტიუმი', 'women-swimsuit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-swimsuit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქამარი', 'women-belt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-belt');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საფულე', 'women-wallet', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'women-wallet');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცვალი', 'men-underwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-underwear');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ხალათი', 'men-nightgown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-nightgown');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'წინდები', 'men-socks', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-socks');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცურაო კოსტიუმი', 'men-swimsuit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-swimsuit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქამარი', 'men-belt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-belt');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საფულე', 'men-wallet', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'men-wallet');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცვალი', 'kids-underwear', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-underwear');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ხალათი', 'kids-nightgown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-nightgown');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'წინდები', 'kids-socks', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-socks');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საცურაო კოსტიუმი', 'kids-swimsuit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-swimsuit');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'ქამარი', 'kids-belt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-belt');

    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    SELECT 'საფულე', 'kids-wallet', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'kids-wallet');
  END IF;
END $$;
