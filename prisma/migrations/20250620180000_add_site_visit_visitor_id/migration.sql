-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "visitorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_visitorId_idx" ON "SiteVisit"("visitorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_visitorId_createdAt_idx" ON "SiteVisit"("visitorId", "createdAt");
