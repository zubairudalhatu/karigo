-- AlterEnum
ALTER TYPE "AppSurface" ADD VALUE 'PARTNER_APP';

-- CreateTable
CREATE TABLE "partner_mobile_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_mobile_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_mobile_files" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "applicationId" UUID,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT,
    "storageBucket" TEXT,
    "purpose" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'OTHER',
    "documentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "partner_mobile_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_push_preferences" (
    "userId" UUID NOT NULL,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "settlements" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_push_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "partner_push_deliveries" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "partner_push_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_mobile_sessions_refreshHash_key" ON "partner_mobile_sessions"("refreshHash");

-- CreateIndex
CREATE INDEX "partner_mobile_sessions_userId_revokedAt_idx" ON "partner_mobile_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_mobile_files_storageKey_key" ON "partner_mobile_files"("storageKey");

-- CreateIndex
CREATE INDEX "partner_mobile_files_userId_deletedAt_idx" ON "partner_mobile_files"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_push_deliveries_eventKey_key" ON "partner_push_deliveries"("eventKey");

-- CreateIndex
CREATE INDEX "partner_push_deliveries_state_createdAt_idx" ON "partner_push_deliveries"("state", "createdAt");

-- AddForeignKey
ALTER TABLE "partner_mobile_sessions" ADD CONSTRAINT "partner_mobile_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_mobile_files" ADD CONSTRAINT "partner_mobile_files_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_mobile_files" ADD CONSTRAINT "partner_mobile_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_push_preferences" ADD CONSTRAINT "partner_push_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
