-- Task 50: persistent sessions and richer product catalogue
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'GROCERIES', 'MARKET_ITEMS');

ALTER TABLE "products"
  ADD COLUMN "productCategory" "ProductCategory" NOT NULL DEFAULT 'FOOD',
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "refresh_tokens" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_revokedAt_expiresAt_idx" ON "refresh_tokens"("userId", "revokedAt", "expiresAt");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "products_vendorId_productCategory_isActive_isAvailable_idx"
  ON "products"("vendorId", "productCategory", "isActive", "isAvailable");
