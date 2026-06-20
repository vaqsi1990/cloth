-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_ip_idx" ON "SiteVisit"("ip");

-- CreateIndex
CREATE INDEX "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");

-- CreateIndex
CREATE INDEX "SiteVisit_ip_createdAt_idx" ON "SiteVisit"("ip", "createdAt");
