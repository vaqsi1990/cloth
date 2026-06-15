-- CreateEnum
CREATE TYPE "BlacklistSource" AS ENUM ('MANUAL_BAN', 'REVENUE_THRESHOLD');

-- CreateTable
CREATE TABLE "UserBlacklistRecord" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userEmail" TEXT,
    "userPhone" TEXT,
    "personalId" TEXT,
    "reason" TEXT NOT NULL,
    "adminNotes" TEXT,
    "source" "BlacklistSource" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "UserBlacklistRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBlacklistRecord_userId_idx" ON "UserBlacklistRecord"("userId");

-- CreateIndex
CREATE INDEX "UserBlacklistRecord_isActive_idx" ON "UserBlacklistRecord"("isActive");

-- CreateIndex
CREATE INDEX "UserBlacklistRecord_createdAt_idx" ON "UserBlacklistRecord"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserBlacklistRecord" ADD CONSTRAINT "UserBlacklistRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklistRecord" ADD CONSTRAINT "UserBlacklistRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlacklistRecord" ADD CONSTRAINT "UserBlacklistRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
