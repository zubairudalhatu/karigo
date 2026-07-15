-- Task 131: Audit logs, vendor team roles, branches, branding support,
-- application document metadata, vendor activation, login activity and biometric readiness.

CREATE TYPE "LoginActivityOutcome" AS ENUM (
  'SUCCESS',
  'FAILED',
  'BLOCKED'
);

CREATE TYPE "VendorTeamRole" AS ENUM (
  'OWNER',
  'MANAGER',
  'ORDER_MANAGER',
  'CATALOG_MANAGER',
  'FINANCE',
  'SUPPORT',
  'VIEWER'
);

CREATE TYPE "VendorTeamInvitationStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED'
);

CREATE TYPE "VendorBranchStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'CLOSED'
);

CREATE TYPE "VendorActivationInvitationStatus" AS ENUM (
  'PENDING',
  'USED',
  'REVOKED',
  'EXPIRED'
);

CREATE TYPE "BiometricCredentialStatus" AS ENUM (
  'REGISTERED',
  'DISABLED'
);

ALTER TABLE "delivery_captain_applications" ADD COLUMN "profilePhotoUrl" TEXT;

CREATE TABLE "user_login_activities" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "phoneNumberMasked" TEXT,
  "role" "UserRole",
  "outcome" "LoginActivityOutcome" NOT NULL,
  "reason" TEXT,
  "appSurface" "AppSurface",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_login_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "biometric_credentials" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "credentialIdHash" TEXT NOT NULL,
  "appSurface" "AppSurface" NOT NULL,
  "platform" "DevicePlatform",
  "displayName" TEXT,
  "status" "BiometricCredentialStatus" NOT NULL DEFAULT 'REGISTERED',
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_captain_application_documents" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentName" TEXT,
  "documentUrl" TEXT NOT NULL,
  "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedByAdminId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_captain_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_application_documents" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentName" TEXT,
  "documentUrl" TEXT NOT NULL,
  "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedByAdminId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_branches" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "area" TEXT,
  "phoneNumber" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "status" "VendorBranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_team_members" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "userId" UUID,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "phoneNumber" TEXT,
  "role" "VendorTeamRole" NOT NULL DEFAULT 'VIEWER',
  "invitationStatus" "VendorTeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitationTokenHash" TEXT,
  "invitedByUserId" UUID,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_team_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_audit_logs" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "actorUserId" UUID,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" UUID,
  "oldValue" JSONB,
  "newValue" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_account_activations" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "VendorActivationInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_account_activations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "biometric_credentials_credentialIdHash_key" ON "biometric_credentials"("credentialIdHash");
CREATE UNIQUE INDEX "vendor_account_activations_tokenHash_key" ON "vendor_account_activations"("tokenHash");

CREATE INDEX "user_login_activities_userId_createdAt_idx" ON "user_login_activities"("userId", "createdAt");
CREATE INDEX "user_login_activities_outcome_createdAt_idx" ON "user_login_activities"("outcome", "createdAt");
CREATE INDEX "biometric_credentials_userId_status_idx" ON "biometric_credentials"("userId", "status");
CREATE INDEX "biometric_credentials_appSurface_status_idx" ON "biometric_credentials"("appSurface", "status");
CREATE INDEX "delivery_captain_application_documents_applicationId_verificationStatus_idx" ON "delivery_captain_application_documents"("applicationId", "verificationStatus");
CREATE INDEX "vendor_application_documents_applicationId_verificationStatus_idx" ON "vendor_application_documents"("applicationId", "verificationStatus");
CREATE INDEX "vendor_branches_vendorId_status_idx" ON "vendor_branches"("vendorId", "status");
CREATE INDEX "vendor_team_members_vendorId_invitationStatus_idx" ON "vendor_team_members"("vendorId", "invitationStatus");
CREATE INDEX "vendor_team_members_phoneNumber_idx" ON "vendor_team_members"("phoneNumber");
CREATE INDEX "vendor_audit_logs_vendorId_createdAt_idx" ON "vendor_audit_logs"("vendorId", "createdAt");
CREATE INDEX "vendor_audit_logs_actorUserId_createdAt_idx" ON "vendor_audit_logs"("actorUserId", "createdAt");
CREATE INDEX "vendor_account_activations_vendorId_status_idx" ON "vendor_account_activations"("vendorId", "status");
CREATE INDEX "vendor_account_activations_userId_status_idx" ON "vendor_account_activations"("userId", "status");

ALTER TABLE "user_login_activities" ADD CONSTRAINT "user_login_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_captain_application_documents" ADD CONSTRAINT "delivery_captain_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "delivery_captain_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_captain_application_documents" ADD CONSTRAINT "delivery_captain_application_documents_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_application_documents" ADD CONSTRAINT "vendor_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_application_documents" ADD CONSTRAINT "vendor_application_documents_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_audit_logs" ADD CONSTRAINT "vendor_audit_logs_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_audit_logs" ADD CONSTRAINT "vendor_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_account_activations" ADD CONSTRAINT "vendor_account_activations_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_account_activations" ADD CONSTRAINT "vendor_account_activations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_account_activations" ADD CONSTRAINT "vendor_account_activations_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
