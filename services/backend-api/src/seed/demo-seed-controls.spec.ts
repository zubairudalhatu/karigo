import {
  demoCredentialUpdate,
  isStagingDemoCredentialResetEnabled,
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
});
