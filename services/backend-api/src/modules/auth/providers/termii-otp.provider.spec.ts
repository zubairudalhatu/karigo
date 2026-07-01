import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import { TermiiOtpProvider } from "./termii-otp.provider";

describe("TermiiOtpProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("does not run without credentials", async () => {
    const provider = new TermiiOtpProvider({ get: jest.fn((_key, fallback) => fallback) } as unknown as ConfigService);
    await expect(provider.sendMessage({ phoneNumber: "+2348012345678", message: "Test" }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("sends a normalized request without exposing the API key in its result", async () => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) => ({
        TERMII_API_KEY: "test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: "message-1" })
    } as Response);
    const provider = new TermiiOtpProvider(config as unknown as ConfigService);

    const result = await provider.sendMessage({ phoneNumber: "+2348012345678", message: "Test message" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.ng.termii.com/api/sms/send",
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.stringify(result)).not.toContain("test-key-not-real");
  });
});
