ALTER TABLE "Product"
ADD COLUMN "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homepageFeaturedAt" TIMESTAMP(3);

CREATE INDEX "Product_featuredOnHomepage_homepageFeaturedAt_idx"
ON "Product"("featuredOnHomepage", "homepageFeaturedAt");
