-- CreateEnum
CREATE TYPE "public"."UserGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" "public"."UserGender",
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "postalIndex" TEXT;
