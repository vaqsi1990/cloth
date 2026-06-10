-- CreateEnum
CREATE TYPE "DeliverySpeed" AS ENUM ('EXTRA', 'STANDARD');

-- AlterTable DeliveryCity: split price into extra + standard
ALTER TABLE "DeliveryCity" ADD COLUMN "extraPrice" DOUBLE PRECISION;
ALTER TABLE "DeliveryCity" ADD COLUMN "standardPrice" DOUBLE PRECISION;

UPDATE "DeliveryCity" SET "extraPrice" = "price", "standardPrice" = "price";

ALTER TABLE "DeliveryCity" ALTER COLUMN "extraPrice" SET NOT NULL;
ALTER TABLE "DeliveryCity" ALTER COLUMN "standardPrice" SET NOT NULL;
ALTER TABLE "DeliveryCity" DROP COLUMN "price";

-- AlterTable Cart
ALTER TABLE "Cart" ADD COLUMN "deliveryType" TEXT;
ALTER TABLE "Cart" ADD COLUMN "deliverySpeed" "DeliverySpeed";

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "deliverySpeed" "DeliverySpeed";
