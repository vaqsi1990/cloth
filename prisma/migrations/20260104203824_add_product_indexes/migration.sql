-- Add indexes to Product table for better query performance
CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");
CREATE INDEX IF NOT EXISTS "Product_approvalStatus_idx" ON "Product"("approvalStatus");
CREATE INDEX IF NOT EXISTS "Product_status_approvalStatus_idx" ON "Product"("status", "approvalStatus");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_purposeId_idx" ON "Product"("purposeId");
CREATE INDEX IF NOT EXISTS "Product_gender_idx" ON "Product"("gender");
CREATE INDEX IF NOT EXISTS "Product_isNew_idx" ON "Product"("isNew");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX IF NOT EXISTS "Product_createdAt_id_idx" ON "Product"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "Product_userId_idx" ON "Product"("userId");
CREATE INDEX IF NOT EXISTS "Product_status_approvalStatus_userId_idx" ON "Product"("status", "approvalStatus", "userId");

-- Add indexes to ProductImage table
CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX IF NOT EXISTS "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- Add index to ProductVariant table
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

