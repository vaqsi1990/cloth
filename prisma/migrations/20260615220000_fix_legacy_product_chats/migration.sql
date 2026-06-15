DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ChatRoom'
  ) THEN
    -- Backfill productId on legacy buyer↔seller rooms from rental inquiries
    UPDATE "ChatRoom" cr
    SET "productId" = ri."productId", "updatedAt" = CURRENT_TIMESTAMP
    FROM "RentalInquiry" ri
    WHERE ri."chatRoomId" = cr.id
      AND cr."productId" IS NULL;

    -- Backfill productId when first message references a product name (legacy widget flow)
    UPDATE "ChatRoom" cr
    SET "productId" = matched."productId", "updatedAt" = CURRENT_TIMESTAMP
    FROM (
      SELECT DISTINCT ON (cr2.id)
        cr2.id AS chat_room_id,
        p.id AS "productId"
      FROM "ChatRoom" cr2
      INNER JOIN "ChatMessage" cm ON cm."chatRoomId" = cr2.id
      INNER JOIN "Product" p ON p."userId" = cr2."adminId"
      WHERE cr2."productId" IS NULL
        AND cr2."userId" IS NOT NULL
        AND cr2."adminId" IS NOT NULL
        AND cm.content LIKE '%' || p.name || '%'
      ORDER BY cr2.id, cm."createdAt" ASC
    ) matched
    WHERE cr.id = matched.chat_room_id
      AND cr."productId" IS NULL;

    -- Close orphaned contact-widget rooms (not buyer↔seller product chats)
    UPDATE "ChatRoom"
    SET status = 'CLOSED', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "adminId" IS NULL
      AND "userId" IS NOT NULL
      AND status IN ('PENDING', 'ACTIVE');

    -- Close staff-assigned support rooms on user accounts (belong in /support or /admin chat)
    UPDATE "ChatRoom" cr
    SET status = 'CLOSED', "updatedAt" = CURRENT_TIMESTAMP
    FROM "User" staff
    WHERE cr."adminId" = staff.id
      AND staff.role IN ('ADMIN', 'SUPPORT')
      AND cr."productId" IS NULL
      AND cr.status IN ('PENDING', 'ACTIVE');
  END IF;
END $$;
