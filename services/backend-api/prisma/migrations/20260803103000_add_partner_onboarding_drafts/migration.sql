-- CreateTable
CREATE TABLE "partner_onboarding_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "applicationId" UUID,
    "onboardingStage" TEXT NOT NULL DEFAULT 'START',
    "accountType" TEXT,
    "draftData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_onboarding_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_onboarding_drafts_userId_key" ON "partner_onboarding_drafts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_onboarding_drafts_applicationId_key" ON "partner_onboarding_drafts"("applicationId");

-- CreateIndex
CREATE INDEX "partner_onboarding_drafts_onboardingStage_idx" ON "partner_onboarding_drafts"("onboardingStage");

-- CreateIndex
CREATE INDEX "partner_onboarding_drafts_submittedAt_idx" ON "partner_onboarding_drafts"("submittedAt");

-- AddForeignKey
ALTER TABLE "partner_onboarding_drafts" ADD CONSTRAINT "partner_onboarding_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_onboarding_drafts" ADD CONSTRAINT "partner_onboarding_drafts_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
