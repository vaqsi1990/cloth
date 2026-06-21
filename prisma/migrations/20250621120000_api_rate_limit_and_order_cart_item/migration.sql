-- CreateTable
CREATE TABLE "ApiRateLimitBucket" (
    "bucketKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("bucketKey")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "sourceCartItemId" INTEGER;
