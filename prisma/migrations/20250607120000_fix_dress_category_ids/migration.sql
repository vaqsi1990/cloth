-- Products were saved with categoryId=2 thinking it was "კაბები",
-- but in DB id=2 is "ბლუზები" and id=1 is "კაბები" (dresses).
UPDATE "Product"
SET "categoryId" = 1
WHERE "categoryId" = 2;
