DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ChatRoom'
  ) THEN
    ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "userTypingAt" TIMESTAMP(3);
    ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "adminTypingAt" TIMESTAMP(3);
  END IF;
END $$;
