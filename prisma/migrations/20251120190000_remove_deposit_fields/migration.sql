-- Drop legacy deposit fields from product, cart, and order entities
ALTER TABLE "Product" DROP COLUMN IF EXISTS "deposit";
ALTER TABLE "CartItem" DROP COLUMN IF EXISTS "deposit";
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "deposit";

