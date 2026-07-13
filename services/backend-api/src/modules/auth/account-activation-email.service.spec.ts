import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountActivationEmailService } from "./account-activation-email.service";

describe("AccountActivationEmailService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("stays disabled unless explicitly enabled", async () => {
    const service = new AccountActivationEmailService({
      get: jest.fn((_key, fallback) => fallback)
    } as unknown as ConfigService);

    await expect(service.sendAccountActivatedEmail({
      userId: "user-1",
      fullName: "Amina Yusuf",
      email: "amina@example.com"
    })).resolves.toEqual({ accepted: false, provider: "disabled", reason: "disabled" });
  });

  it("does not require email for users without an email address", async () => {
    const service = new AccountActivationEmailService({
      get: jest.fn((key: string, fallback: unknown) =>
        key === "ACCOUNT_ACTIVATION_EMAIL_ENABLED" ? true : fallback
      )
    } as unknown as ConfigService);

    await expect(service.sendAccountActivatedEmail({
      userId: "user-1",
      fullName: "Amina Yusuf"
    })).resolves.toEqual({ accepted: false, provider: "disabled", reason: "missing_email" });
  });

  it("uses mock mode without sending a network request", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const service = new AccountActivationEmailService({
      get: jest.fn((key: string, fallback: unknown) => ({
        ACCOUNT_ACTIVATION_EMAIL_ENABLED: true,
        ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "mock"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await expect(service.sendAccountActivatedEmail({
      userId: "user-1",
      fullName: "Amina Yusuf",
      email: "amina@example.com"
    })).resolves.toEqual({ accepted: true, provider: "mock" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends account activation email through Resend without exposing the API key", async () => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) => ({
        ACCOUNT_ACTIVATION_EMAIL_ENABLED: true,
        ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_REPLY_TO: "support@example.test",
        RESEND_BASE_URL: "https://api.resend.com"
      }[key] ?? fallback))
    };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email-1" })
    } as Response);
    const service = new AccountActivationEmailService(config as unknown as ConfigService);

    const result = await service.sendAccountActivatedEmail({
      userId: "user-1",
      fullName: "Amina Yusuf",
      email: "amina@example.com"
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: expect.stringContaining("resend-test-key-not-real") })
      })
    );
    expect(result).toEqual({ accepted: true, provider: "resend", providerReference: "email-1" });
    expect(JSON.stringify(result)).not.toContain("resend-test-key-not-real");
  });

  it("fails safely when Resend credentials are missing", async () => {
    const service = new AccountActivationEmailService({
      get: jest.fn((key: string, fallback: unknown) => ({
        ACCOUNT_ACTIVATION_EMAIL_ENABLED: true,
        ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "resend"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await expect(service.sendAccountActivatedEmail({
      userId: "user-1",
      fullName: "Amina Yusuf",
      email: "amina@example.com"
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
