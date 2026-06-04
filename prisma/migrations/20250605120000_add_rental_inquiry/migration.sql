-- CreateEnum
CREATE TYPE "RentalInquiryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'BOOKED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "requiresInquiryBeforeRent" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "productId" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RentalInquiry" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "size" TEXT,
    "estimatedTotal" DOUBLE PRECISION NOT NULL,
    "status" "RentalInquiryStatus" NOT NULL DEFAULT 'PENDING',
    "onSiteAvailable" BOOLEAN,
    "buyerMessage" TEXT,
    "sellerNote" TEXT,
    "chatRoomId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RentalInquiry_buyerId_status_idx" ON "RentalInquiry"("buyerId", "status");
CREATE INDEX IF NOT EXISTS "RentalInquiry_sellerId_status_idx" ON "RentalInquiry"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "RentalInquiry_productId_status_idx" ON "RentalInquiry"("productId", "status");
CREATE INDEX IF NOT EXISTS "RentalInquiry_expiresAt_idx" ON "RentalInquiry"("expiresAt");
CREATE INDEX IF NOT EXISTS "ChatRoom_productId_idx" ON "ChatRoom"("productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RentalInquiry_productId_fkey'
  ) THEN
    ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RentalInquiry_buyerId_fkey'
  ) THEN
    ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RentalInquiry_sellerId_fkey'
  ) THEN
    ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_sellerId_fkey"
      FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RentalInquiry_chatRoomId_fkey'
  ) THEN
    ALTER TABLE "RentalInquiry" ADD CONSTRAINT "RentalInquiry_chatRoomId_fkey"
      FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatRoom_productId_fkey'
  ) THEN
    ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
