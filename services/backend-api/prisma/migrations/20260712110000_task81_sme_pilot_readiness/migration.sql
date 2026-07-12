CREATE TABLE "sme_services_pilot_readiness_items" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "updatedByAdminId" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sme_services_pilot_readiness_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sme_services_pilot_readiness_items_key_key" ON "sme_services_pilot_readiness_items"("key");
CREATE INDEX "sme_services_pilot_readiness_items_category_sortOrder_idx" ON "sme_services_pilot_readiness_items"("category", "sortOrder");
CREATE INDEX "sme_services_pilot_readiness_items_isRequired_isCompleted_idx" ON "sme_services_pilot_readiness_items"("isRequired", "isCompleted");
