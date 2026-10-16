-- Local review only. Does not create accounts or change existing roles.
ALTER TYPE "AdminRole" ADD VALUE 'RESTORE_GOVERNANCE';
ALTER TABLE users ALTER COLUMN "phoneNumber" DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT governance_email_phone_required CHECK (
 "phoneNumber" IS NOT NULL OR
 COALESCE((role = 'ADMIN' AND "adminRole"::text = 'RESTORE_GOVERNANCE' AND email IS NOT NULL), false));
CREATE TABLE admin_email_identities (
 "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "emailKey" TEXT NOT NULL UNIQUE,
 "credentialVersion" INTEGER NOT NULL DEFAULT 0,
 "failedLogins" INTEGER NOT NULL DEFAULT 0,
 "lockedUntil" TIMESTAMP(3), "lastChallengeAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE admin_email_challenges (
 id UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES admin_email_identities("userId") ON DELETE CASCADE ON UPDATE CASCADE,
 "tokenHash" TEXT NOT NULL UNIQUE, purpose TEXT NOT NULL CHECK (purpose IN ('SETUP','RESET')),
 "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "admin_email_challenges_userId_createdAt_idx" ON admin_email_challenges("userId", "createdAt");
