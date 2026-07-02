-- Fix drift: migration was recorded but column may be missing on some databases.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sourceCartItemId" INTEGER;
