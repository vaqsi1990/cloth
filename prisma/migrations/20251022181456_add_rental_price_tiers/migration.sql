-- CreateTable
CREATE TABLE "public"."RentalPriceTier" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "minDays" INTEGER NOT NULL,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalPriceTier_productId_idx" ON "public"."RentalPriceTier"("productId");

-- AddForeignKey
ALTER TABLE "public"."RentalPriceTier" ADD CONSTRAINT "RentalPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
