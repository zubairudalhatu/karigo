CREATE TYPE "SmeServicesPilotParticipantType" AS ENUM (
  'CUSTOMER',
  'SERVICE_PROVIDER',
  'INTERNAL_OBSERVER'
);

CREATE TYPE "SmeServicesPilotParticipantStatus" AS ENUM (
  'DRAFT',
  'READY_TO_INVITE',
  'INVITED_MANUALLY',
  'CONFIRMED',
  'DECLINED',
  'REMOVED'
);

CREATE TYPE "SmeServicesPilotInvitationChannel" AS ENUM (
  'PHONE',
  'WHATSAPP',
  'EMAIL',
  'IN_PERSON',
  'IN_APP_NOTE',
  'OTHER'
);

CREATE TABLE "sme_services_pilot_participants" (
  "id" UUID NOT NULL,
  "participantType" "SmeServicesPilotParticipantType" NOT NULL,
  "status" "SmeServicesPilotParticipantStatus" NOT NULL DEFAULT 'DRAFT',
  "displayName" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "email" TEXT,
  "organization" TEXT,
  "city" TEXT,
  "pilotZone" TEXT,
  "relatedUserId" UUID,
  "relatedProviderId" UUID,
  "invitationChannel" "SmeServicesPilotInvitationChannel",
  "invitationNote" TEXT,
  "internalNotes" TEXT,
  "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "safetyBriefingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "invitedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdByAdminId" UUID,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sme_services_pilot_participants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sme_services_pilot_participants_participantType_status_idx" ON "sme_services_pilot_participants"("participantType", "status");
CREATE INDEX "sme_services_pilot_participants_status_createdAt_idx" ON "sme_services_pilot_participants"("status", "createdAt");
CREATE INDEX "sme_services_pilot_participants_phoneNumber_idx" ON "sme_services_pilot_participants"("phoneNumber");
CREATE INDEX "sme_services_pilot_participants_relatedProviderId_idx" ON "sme_services_pilot_participants"("relatedProviderId");
