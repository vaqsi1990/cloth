INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
SELECT 'აქსესუარები', 'aksesuarebi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" WHERE "slug" = 'aksesuarebi'
);
