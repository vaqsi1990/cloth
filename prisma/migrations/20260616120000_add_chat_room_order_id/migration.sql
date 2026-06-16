-- Link product chats to a specific order (separate thread per rental/purchase order)
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "orderId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatRoom_orderId_fkey'
  ) THEN
    ALTER TABLE "ChatRoom"
      ADD CONSTRAINT "ChatRoom_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ChatRoom_orderId_idx" ON "ChatRoom"("orderId");
