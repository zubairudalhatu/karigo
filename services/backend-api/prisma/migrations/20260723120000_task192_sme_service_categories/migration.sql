-- Task 192: SME Services category expansion for unified partner onboarding.

ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'PRINTING';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'CAR_HIRE';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'LAUNDRY';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'LESSON_TEACHER';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'LEGAL_PRACTITIONER';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'RENT_A_CAR';
