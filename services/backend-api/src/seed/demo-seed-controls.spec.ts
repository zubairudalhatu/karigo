import {
  demoCredentialUpdate,
  isDemoSeedDataAllowed,
  isProductionSeedEnvironment,
  isStagingDemoCredentialResetEnabled,
  productionSeedMessages,
  stagingSeedMessages
} from "./demo-seed-controls";

describe("demo seed credential controls", () => {
  it("enables reset only when explicitly requested in staging", () => {
    expect(
      isStagingDemoCredentialResetEnabled({
        APP_ENV: "staging",
        STAGING_RESET_DEMO_CREDENTIALS: "true"
      })
    ).toBe(true);
  });

  it("blocks reset outside staging even when requested", () => {
    expect(
      isStagingDemoCredentialResetEnabled({
        APP_ENV: "production",
        STAGING_RESET_DEMO_CREDENTIALS: "true"
      })
    ).toBe(false);
    expect(
      isStagingDemoCredentialResetEnabled({
        APP_ENV: "development",
        STAGING_RESET_DEMO_CREDENTIALS: "true"
      })
    ).toBe(false);
  });

  it("preserves existing password hashes when reset mode is off", () => {
    expect(demoCredentialUpdate(false, "new-hash")).toEqual({});
  });

  it("updates password hashes only when reset mode is enabled", () => {
    expect(demoCredentialUpdate(true, "new-hash")).toEqual({ passwordHash: "new-hash" });
  });

  it("does not include plaintext passwords in safe seed messages", () => {
    const messages = stagingSeedMessages(true);
    expect(messages.join("\n")).not.toContain("ChangeMe");
    expect(messages.join("\n")).not.toContain("password");
    expect(messages).toContain("Credential reset applied: yes");
  });

  it("detects production seed mode from APP_ENV or NODE_ENV", () => {
    expect(isProductionSeedEnvironment({ APP_ENV: "production" })).toBe(true);
    expect(isProductionSeedEnvironment({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionSeedEnvironment({ APP_ENV: "staging", NODE_ENV: "production" })).toBe(false);
    expect(isProductionSeedEnvironment({ APP_ENV: "development", NODE_ENV: "production" })).toBe(false);
  });

  it("allows demo seed data by default outside production", () => {
    expect(isDemoSeedDataAllowed({ APP_ENV: "staging" })).toBe(true);
    expect(isDemoSeedDataAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("blocks demo seed data outside production when explicitly disabled", () => {
    expect(isDemoSeedDataAllowed({ APP_ENV: "staging", ALLOW_DEMO_SEED_DATA: "false" })).toBe(false);
  });

  it("blocks production demo seed data unless both explicit flags are enabled", () => {
    expect(isDemoSeedDataAllowed({ APP_ENV: "production" })).toBe(false);
    expect(isDemoSeedDataAllowed({ APP_ENV: "production", ALLOW_DEMO_SEED_DATA: "true" })).toBe(false);
    expect(isDemoSeedDataAllowed({ APP_ENV: "production", SEED_PRODUCTION_DEMO_DATA: "true" })).toBe(false);
    expect(isDemoSeedDataAllowed({
      APP_ENV: "production",
      ALLOW_DEMO_SEED_DATA: "true",
      SEED_PRODUCTION_DEMO_DATA: "true"
    })).toBe(true);
  });

  it("explains production demo seed decisions without secrets", () => {
    expect(productionSeedMessages(false).join("\n")).toContain("Demo seed data allowed: no");
    expect(productionSeedMessages(true).join("\n")).toContain("Demo seed data allowed: yes");
    expect(productionSeedMessages(true).join("\n")).not.toContain("PASSWORD");
  });
});
