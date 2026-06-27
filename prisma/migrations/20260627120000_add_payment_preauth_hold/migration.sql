-- CreateEnum
CREATE TYPE "PaymentCaptureMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentHoldStatus" AS ENUM ('NONE', 'BLOCKED', 'CAPTURED', 'RELEASED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentCaptureMode" "PaymentCaptureMode" NOT NULL DEFAULT 'AUTOMATIC';
ALTER TABLE "Order" ADD COLUMN "paymentHoldStatus" "PaymentHoldStatus" NOT NULL DEFAULT 'NONE';
