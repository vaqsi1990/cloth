-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "sellerReportedDamaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "sellerReportedDamagedAt" TIMESTAMP(3);
