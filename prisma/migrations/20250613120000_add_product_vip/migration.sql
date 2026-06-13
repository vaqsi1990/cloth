-- CreateEnum
CREATE TYPE "VipPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isVip" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "vipExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProductVipPayment" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "status" "VipPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "vipExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVipPayment_productId_idx" ON "ProductVipPayment"("productId");
CREATE INDEX "ProductVipPayment_paymentId_idx" ON "ProductVipPayment"("paymentId");
CREATE INDEX "ProductVipPayment_userId_idx" ON "ProductVipPayment"("userId");
CREATE INDEX "Product_isVip_vipExpiresAt_idx" ON "Product"("isVip", "vipExpiresAt");

-- AddForeignKey
ALTER TABLE "ProductVipPayment" ADD CONSTRAINT "ProductVipPayment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVipPayment" ADD CONSTRAINT "ProductVipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
