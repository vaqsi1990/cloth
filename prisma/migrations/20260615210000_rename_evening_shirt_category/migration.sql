DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    UPDATE "Category"
    SET "name" = 'საღამოს პერანგი', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'evening-shirt';
  END IF;
END $$;
