-- CreateEnum
CREATE TYPE "public"."SizeSystem" AS ENUM ('EU', 'US', 'UK', 'CN');

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "sizeSystem" "public"."SizeSystem";
