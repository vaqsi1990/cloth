-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "purposeId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Purpose" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purpose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purpose_slug_key" ON "public"."Purpose"("slug");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "public"."Purpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;
