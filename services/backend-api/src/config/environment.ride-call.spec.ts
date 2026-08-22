import { validateEnvironment } from "./environment";

describe("Ride call environment configuration", () => {
  const base = {
    DATABASE_URL: "TEST_DATABASE_URL_PLACEHOLDER",
    JWT_SECRET: "test-secret"
  };

  it("keeps Ride calls disabled and secrets empty by default", () => {
    const result = validateEnvironment(base);
    expect(result.RIDE_IN_APP_CALL_ENABLED).toBe(false);
    expect(result.RIDE_CALL_PROVIDER).toBe("disabled");
    expect(result.AGORA_APP_ID).toBe("");
    expect(result.AGORA_APP_CERTIFICATE).toBe("");
    expect(result.AGORA_RTC_TOKEN_TTL_SECONDS).toBe(900);
    expect(result.RIDE_CALL_RING_TIMEOUT_SECONDS).toBe(45);
  });

  it("accepts server-only Agora credentials when explicitly enabled", () => {
    const result = validateEnvironment({
      ...base,
      RIDE_IN_APP_CALL_ENABLED: "true",
      RIDE_CALL_PROVIDER: "agora",
      AGORA_APP_ID: "a".repeat(32),
      AGORA_APP_CERTIFICATE: "b".repeat(32),
      AGORA_RTC_TOKEN_TTL_SECONDS: "600",
      RIDE_CALL_RING_TIMEOUT_SECONDS: "40"
    });
    expect(result.RIDE_IN_APP_CALL_ENABLED).toBe(true);
    expect(result.RIDE_CALL_PROVIDER).toBe("agora");
    expect(result.AGORA_RTC_TOKEN_TTL_SECONDS).toBe(600);
    expect(result.RIDE_CALL_RING_TIMEOUT_SECONDS).toBe(40);
  });

  it("requires complete server credentials and the Agora provider", () => {
    expect(() => validateEnvironment({
      ...base,
      RIDE_IN_APP_CALL_ENABLED: "true",
      RIDE_CALL_PROVIDER: "agora",
      AGORA_APP_ID: "a".repeat(32)
    })).toThrow("AGORA_APP_CERTIFICATE");
    expect(() => validateEnvironment({
      ...base,
      RIDE_IN_APP_CALL_ENABLED: "true",
      RIDE_CALL_PROVIDER: "disabled",
      AGORA_APP_ID: "a".repeat(32),
      AGORA_APP_CERTIFICATE: "b".repeat(32)
    })).toThrow("RIDE_CALL_PROVIDER=agora");
  });

  it("rejects any public App Certificate variable", () => {
    expect(() => validateEnvironment({
      ...base,
      EXPO_PUBLIC_AGORA_APP_CERTIFICATE: "must-never-be-public"
    })).toThrow("EXPO_PUBLIC_AGORA_APP_CERTIFICATE is forbidden");
  });

  it("enforces short token and ring time bounds", () => {
    expect(() => validateEnvironment({ ...base, AGORA_RTC_TOKEN_TTL_SECONDS: "120" })).toThrow("between 300 and 3600");
    expect(() => validateEnvironment({ ...base, RIDE_CALL_RING_TIMEOUT_SECONDS: "10" })).toThrow("between 20 and 120");
  });
});
