CREATE TYPE "CustomerReferralProfileStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED'
);

CREATE TYPE "CustomerReferralStatus" AS ENUM (
  'REGISTERED',
  'ACCOUNT_ACTIVATED',
  'FIRST_VALID_TRANSACTION_COMPLETED',
  'ELIGIBLE_FOR_REWARD',
  'REWARD_REVIEW_PENDING',
  'REWARD_APPROVED',
  'REWARD_ISSUED',
  'INELIGIBLE',
  'CANCELLED'
);

CREATE TYPE "ReferralRewardTrigger" AS ENUM (
  'ACCOUNT_ACTIVATED',
  'FIRST_COMPLETED_ORDER',
  'FIRST_COMPLETED_UTILITY_TRANSACTION',
  'MANUAL_ADMIN_REVIEW'
);

CREATE TYPE "ReferralRewardType" AS ENUM (
  'WALLET_CREDIT',
  'PROMO_CODE',
  'AIRTIME',
  'DATA',
  'MANUAL_REVIEW'
);

CREATE TABLE "customer_referral_profiles" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "status" "CustomerReferralProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "shareEnabled" BOOLEAN NOT NULL DEFAULT true,
  "totalReferrals" INTEGER NOT NULL DEFAULT 0,
  "activatedReferrals" INTEGER NOT NULL DEFAULT 0,
  "eligibleReferrals" INTEGER NOT NULL DEFAULT 0,
  "lastReferralAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_referral_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_referrals" (
  "id" UUID NOT NULL,
  "referrerProfileId" UUID NOT NULL,
  "referrerCustomerId" UUID NOT NULL,
  "referredCustomerId" UUID NOT NULL,
  "referralCode" TEXT NOT NULL,
  "status" "CustomerReferralStatus" NOT NULL DEFAULT 'REGISTERED',
  "rewardRuleId" UUID,
  "accountActivatedAt" TIMESTAMP(3),
  "firstValidTransactionAt" TIMESTAMP(3),
  "eligibleAt" TIMESTAMP(3),
  "rewardReviewedAt" TIMESTAMP(3),
  "rewardIssuedAt" TIMESTAMP(3),
  "adminNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_referral_reward_rules" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" "ReferralRewardTrigger" NOT NULL DEFAULT 'FIRST_COMPLETED_ORDER',
  "rewardType" "ReferralRewardType" NOT NULL DEFAULT 'MANUAL_REVIEW',
  "referrerRewardValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "referredCustomerRewardValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "minimumTransactionAmount" DECIMAL(12,2),
  "requiredValidTransactions" INTEGER NOT NULL DEFAULT 1,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_referral_reward_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_referral_profiles_customerId_key" ON "customer_referral_profiles"("customerId");
CREATE UNIQUE INDEX "customer_referral_profiles_code_key" ON "customer_referral_profiles"("code");
CREATE INDEX "customer_referral_profiles_status_shareEnabled_idx" ON "customer_referral_profiles"("status", "shareEnabled");
CREATE UNIQUE INDEX "customer_referrals_referredCustomerId_key" ON "customer_referrals"("referredCustomerId");
CREATE INDEX "customer_referrals_referrerCustomerId_createdAt_idx" ON "customer_referrals"("referrerCustomerId", "createdAt");
CREATE INDEX "customer_referrals_status_createdAt_idx" ON "customer_referrals"("status", "createdAt");
CREATE INDEX "customer_referrals_referralCode_idx" ON "customer_referrals"("referralCode");
CREATE INDEX "customer_referral_reward_rules_isActive_trigger_idx" ON "customer_referral_reward_rules"("isActive", "trigger");
CREATE INDEX "customer_referral_reward_rules_rewardType_idx" ON "customer_referral_reward_rules"("rewardType");

ALTER TABLE "customer_referral_profiles" ADD CONSTRAINT "customer_referral_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "customer_referral_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_rewardRuleId_fkey" FOREIGN KEY ("rewardRuleId") REFERENCES "customer_referral_reward_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_referral_reward_rules" ADD CONSTRAINT "customer_referral_reward_rules_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "customer_referral_profiles" (
  "id",
  "customerId",
  "code",
  "status",
  "shareEnabled",
  "totalReferrals",
  "activatedReferrals",
  "eligibleReferrals",
  "createdAt",
  "updatedAt"
)
SELECT
  (
    substr("hash", 1, 8) || '-' ||
    substr("hash", 9, 4) || '-' ||
    substr("hash", 13, 4) || '-' ||
    substr("hash", 17, 4) || '-' ||
    substr("hash", 21, 12)
  )::uuid,
  "id",
  "referralCode",
  'ACTIVE',
  true,
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    "id",
    "referralCode",
    md5("id"::text || ':referral-profile') AS "hash"
  FROM "customer_profiles"
) AS "source"
ON CONFLICT ("customerId") DO NOTHING;
