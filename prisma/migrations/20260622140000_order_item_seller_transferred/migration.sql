-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "sellerMarkedTransferred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "sellerMarkedTransferredAt" TIMESTAMP(3);
