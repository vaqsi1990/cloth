-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "deposit" DOUBLE PRECISION,
ADD COLUMN     "isRental" BOOLEAN,
ADD COLUMN     "rentalDays" INTEGER,
ADD COLUMN     "rentalEndDate" TIMESTAMP(3),
ADD COLUMN     "rentalStartDate" TIMESTAMP(3);
