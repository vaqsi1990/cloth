-- AlterTable
ALTER TABLE "UserVoucher" ADD COLUMN "seenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserVoucher_userId_seenAt_idx" ON "UserVoucher"("userId", "seenAt");
