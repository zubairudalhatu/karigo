import { SetMetadata } from "@nestjs/common";

export const CAPTAIN_ONBOARDING_SCOPE = "captain-onboarding";
export const CAPTAIN_ONBOARDING_ALLOWED = "captain-onboarding-allowed";
// Method-only opt-in. New authenticated endpoints deny onboarding tokens by default.
export const AllowCaptainOnboarding = () => SetMetadata(CAPTAIN_ONBOARDING_ALLOWED, true);
