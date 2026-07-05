-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "sellerCanceledItem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "sellerCanceledAt" TIMESTAMP(3);
