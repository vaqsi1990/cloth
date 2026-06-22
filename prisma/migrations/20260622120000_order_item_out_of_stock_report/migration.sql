-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "sellerReportedOutOfStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "sellerReportedAt" TIMESTAMP(3);
