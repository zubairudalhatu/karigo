-- Task 51: product option groups and add-ons
CREATE TABLE "product_option_groups" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER NOT NULL DEFAULT 1,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_options" (
  "id" UUID NOT NULL,
  "optionGroupId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "priceAdjustmentKobo" INTEGER NOT NULL DEFAULT 0,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_option_groups_productId_isActive_displayOrder_idx"
  ON "product_option_groups"("productId", "isActive", "displayOrder");

CREATE INDEX "product_options_optionGroupId_available_displayOrder_idx"
  ON "product_options"("optionGroupId", "available", "displayOrder");

ALTER TABLE "product_option_groups"
  ADD CONSTRAINT "product_option_groups_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_options"
  ADD CONSTRAINT "product_options_optionGroupId_fkey"
  FOREIGN KEY ("optionGroupId") REFERENCES "product_option_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
