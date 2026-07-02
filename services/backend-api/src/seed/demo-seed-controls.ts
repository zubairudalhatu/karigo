export const DEMO_ACCOUNT_PHONES = {
  operationsAdmin: "+2348000000001",
  vendorOwner: "+2348000000101",
  customer: "+2348000000201",
  rider: "+2348000000401"
} as const;

export function isStagingDemoCredentialResetEnabled(
  env: Partial<Pick<NodeJS.ProcessEnv, "APP_ENV" | "STAGING_RESET_DEMO_CREDENTIALS">> = process.env
): boolean {
  return env.APP_ENV === "staging" && env.STAGING_RESET_DEMO_CREDENTIALS === "true";
}

export function isDemoCredentialResetRequested(
  env: Partial<Pick<NodeJS.ProcessEnv, "STAGING_RESET_DEMO_CREDENTIALS">> = process.env
): boolean {
  return env.STAGING_RESET_DEMO_CREDENTIALS === "true";
}

export function demoCredentialUpdate(resetEnabled: boolean, passwordHash: string) {
  return resetEnabled ? { passwordHash } : {};
}

export function stagingSeedMessages(resetEnabled: boolean): string[] {
  return [
    "Demo Super Admin ensured",
    "Demo Operations Admin ensured",
    "Demo Vendor ensured",
    "Demo Rider ensured",
    "Demo Customer ensured",
    `Credential reset applied: ${resetEnabled ? "yes" : "no"}`
  ];
}
