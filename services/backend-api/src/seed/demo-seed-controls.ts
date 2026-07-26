export const DEMO_ACCOUNT_PHONES = {
  operationsAdmin: "+2348000000001",
  vendorOwner: "+2348000000101",
  groceryVendorOwner: "+2348000000102",
  marketVendorOwner: "+2348000000103",
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

export function isProductionSeedEnvironment(
  env: Partial<Pick<NodeJS.ProcessEnv, "APP_ENV" | "NODE_ENV">> = process.env
): boolean {
  if (env.APP_ENV) return env.APP_ENV === "production";
  return env.NODE_ENV === "production";
}

export function isDemoSeedDataAllowed(
  env: Partial<Pick<NodeJS.ProcessEnv, "ALLOW_DEMO_SEED_DATA" | "APP_ENV" | "NODE_ENV" | "SEED_PRODUCTION_DEMO_DATA">> = process.env
): boolean {
  if (isProductionSeedEnvironment(env)) {
    return env.SEED_PRODUCTION_DEMO_DATA === "true" && env.ALLOW_DEMO_SEED_DATA === "true";
  }
  if (env.ALLOW_DEMO_SEED_DATA === "true") return true;
  return env.ALLOW_DEMO_SEED_DATA !== "false";
}

export function demoCredentialUpdate(resetEnabled: boolean, passwordHash: string) {
  return resetEnabled ? { passwordHash } : {};
}

export function stagingSeedMessages(resetEnabled: boolean): string[] {
  return [
    "Demo Super Admin ensured",
    "Demo Operations Admin ensured",
    "Demo Vendor ensured",
    "Demo Grocery Vendor ensured",
    "Demo Market Vendor ensured",
    "Demo Rider ensured",
    "Demo Customer ensured",
    `Credential reset applied: ${resetEnabled ? "yes" : "no"}`
  ];
}

export function productionSeedMessages(demoSeedDataAllowed: boolean): string[] {
  return [
    "Production seed mode detected",
    `Demo seed data allowed: ${demoSeedDataAllowed ? "yes" : "no"}`,
    demoSeedDataAllowed
      ? "Demo seed data override is enabled; confirm this is intentional before using production traffic."
      : "Demo users, vendors, products, orders and utility catalogue were skipped."
  ];
}
