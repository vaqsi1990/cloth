-- ProductVariant: restore color, size, stock for multi-SKU support
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "sizeSystem" "SizeSystem";
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;

-- CartItem / OrderItem: link to selected variant
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "variantId" INTEGER;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "color" TEXT;

ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_productId_size_isRental_rentalStartDate_rentalEndDate_key";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_productId_variantId_size_isRental_rentalStartDate_rentalEndDate_key"
  UNIQUE ("cartId", "productId", "variantId", "size", "isRental", "rentalStartDate", "rentalEndDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_variantId_fkey'
  ) THEN
    ALTER TABLE "CartItem"
      ADD CONSTRAINT "CartItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_variantId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_color_size_key"
  ON "ProductVariant" ("productId", "color", "size");

-- Backfill single-SKU products: copy product color/size to variants that lack them
UPDATE "ProductVariant" pv
SET
  "color" = COALESCE(pv."color", p."color"),
  "size" = COALESCE(pv."size", p."size"),
  "sizeSystem" = COALESCE(pv."sizeSystem", p."sizeSystem"),
  "stock" = CASE WHEN pv."stock" = 0 THEN COALESCE(p."stock", 0) ELSE pv."stock" END
FROM "Product" p
WHERE pv."productId" = p."id"
  AND (pv."color" IS NULL OR pv."size" IS NULL);
