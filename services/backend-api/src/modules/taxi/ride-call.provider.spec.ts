import { ServiceUnavailableException } from "@nestjs/common";
import { AgoraRideCallProvider } from "./ride-call.provider";

describe("AgoraRideCallProvider", () => {
  const values: Record<string, unknown> = {
    RIDE_IN_APP_CALL_ENABLED: true,
    RIDE_CALL_PROVIDER: "agora",
    AGORA_APP_ID: "a".repeat(32),
    AGORA_APP_CERTIFICATE: "b".repeat(32),
    AGORA_RTC_TOKEN_TTL_SECONDS: 600
  };
  const config: any = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) throw new Error(`missing ${key}`);
      return values[key];
    })
  };

  beforeEach(() => jest.clearAllMocks());

  it("creates short-lived participant-only credentials without exposing the App Certificate", () => {
    const provider = new AgoraRideCallProvider(config);
    const before = Date.now();
    const result = provider.createParticipantToken({ channel: "kgr_private_channel", uid: 18271 });
    expect(result).toMatchObject({
      appId: values.AGORA_APP_ID,
      channel: "kgr_private_channel",
      uid: 18271
    });
    expect(result.token).toEqual(expect.any(String));
    expect(result.token.length).toBeGreaterThan(40);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 599_000);
    expect(JSON.stringify(result)).not.toContain(String(values.AGORA_APP_CERTIFICATE));
  });

  it("clamps token lifetime to the approved 5-60 minute window", () => {
    values.AGORA_RTC_TOKEN_TTL_SECONDS = 1;
    const result = new AgoraRideCallProvider(config).createParticipantToken({ channel: "kgr_private", uid: 1 });
    expect(new Date(result.expiresAt).getTime() - Date.now()).toBeGreaterThanOrEqual(299_000);
    values.AGORA_RTC_TOKEN_TTL_SECONDS = 600;
  });

  it("fails closed when Ride calling is disabled", () => {
    values.RIDE_IN_APP_CALL_ENABLED = false;
    const provider = new AgoraRideCallProvider(config);
    expect(provider.readiness()).toMatchObject({ enabled: false, provider: null, recordingEnabled: false });
    expect(() => provider.createParticipantToken({ channel: "kgr_private", uid: 1 })).toThrow(ServiceUnavailableException);
    values.RIDE_IN_APP_CALL_ENABLED = true;
  });
});
