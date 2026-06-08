-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isSecondHand" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_isSecondHand_idx" ON "Product"("isSecondHand");
