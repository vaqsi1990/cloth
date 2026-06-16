-- Persist sold-item details after the product row is deleted.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sellerUserId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "productSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "OrderItem_sellerUserId_idx" ON "OrderItem"("sellerUserId");
