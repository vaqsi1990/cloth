-- AlterTable
ALTER TABLE "public"."Cart" ADD COLUMN     "deliveryCityId" INTEGER,
ADD COLUMN     "deliveryPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "deliveryCityId" INTEGER,
ADD COLUMN     "deliveryPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."DeliveryCity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCity_name_key" ON "public"."DeliveryCity"("name");

-- CreateIndex
CREATE INDEX "DeliveryCity_isActive_idx" ON "public"."DeliveryCity"("isActive");

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_deliveryCityId_fkey" FOREIGN KEY ("deliveryCityId") REFERENCES "public"."DeliveryCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_deliveryCityId_fkey" FOREIGN KEY ("deliveryCityId") REFERENCES "public"."DeliveryCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
