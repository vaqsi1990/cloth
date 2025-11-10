/*
  Warnings:

  - You are about to drop the column `hasSale` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "hasSale",
ADD COLUMN     "discount" INTEGER;
