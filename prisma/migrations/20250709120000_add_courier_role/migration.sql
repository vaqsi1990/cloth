-- CreateEnum
CREATE TYPE "CourierDeliveryStatus" AS ENUM ('PENDING', 'PICKED_UP', 'DELIVERED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'COURIER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierId" TEXT,
ADD COLUMN     "courierStatus" "CourierDeliveryStatus",
ADD COLUMN     "courierNote" TEXT,
ADD COLUMN     "courierPickedUpAt" TIMESTAMP(3),
ADD COLUMN     "courierDeliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_courierId_courierStatus_idx" ON "Order"("courierId", "courierStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
