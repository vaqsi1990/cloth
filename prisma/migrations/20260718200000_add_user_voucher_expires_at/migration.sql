-- AlterTable
ALTER TABLE "UserVoucher" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserVoucher_expiresAt_idx" ON "UserVoucher"("expiresAt");

-- Backfill gift expiry from parent voucher when available
UPDATE "UserVoucher" AS uv
SET "expiresAt" = v."expiresAt"
FROM "Voucher" AS v
WHERE uv."voucherId" = v."id"
  AND uv."expiresAt" IS NULL
  AND v."expiresAt" IS NOT NULL;
