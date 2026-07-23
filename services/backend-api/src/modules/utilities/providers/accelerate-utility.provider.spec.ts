import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { AccelerateUtilityProvider } from "./accelerate-utility.provider";

function response(payload: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(payload)
  } as unknown as Response;
}

describe("AccelerateUtilityProvider", () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
        ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder",
        ACCELERATE_ENV: "sandbox"
      };
      return values[key];
    })
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("validates and vends electricity through documented Accelerate power endpoints", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ data: { access_token: "jwt-token", expires_in: 300 } }))
      .mockResolvedValueOnce(response({ status: "success", data: { validation_reference: "VAL-123" } }))
      .mockResolvedValueOnce(response({
        status: "success",
        message: "Processed",
        data: {
          transaction_reference: "ACC-123",
          transactionStatus: "successful",
          token_info: { token: "TOKEN-123456" },
          privateField: "not-returned-directly"
        }
      }));
    const provider = new AccelerateUtilityProvider(config);

    const result = await provider.purchase({
      serviceType: UtilityServiceType.ELECTRICITY,
      providerCode: "DEMO_KEDCO_PROVIDER",
      amountKobo: 100000,
      recipient: "1234567890",
      reference: "KGO-UTIL-123",
      totalKobo: 100000,
      meterType: "PREPAID",
      customerPhoneNumber: "+2348030000000",
      customerEmail: "customer@example.test"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://test.user-mgt.irechargetech.com/api/v1/auth/api-client/token");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://test.power.irechargetech.com/api/v2/merchant/power/validate");
    expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))).toMatchObject({
      provider: "KEDCO",
      meter_type: "PREPAID",
      receiver: "1234567890",
      amount: 1000,
      phone_number: "+2348030000000"
    });
    expect(String(fetchMock.mock.calls[2][0])).toBe("https://test.power.irechargetech.com/api/v2/merchant/power/vend");
    expect(JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body))).toMatchObject({
      validation_reference: "VAL-123",
      transaction_reference: "KGO-UTIL-123",
      phone_number: "+2348030000000"
    });
    expect(result).toMatchObject({
      status: UtilityTransactionStatus.SUCCESSFUL,
      providerStatus: "successful",
      providerReference: "ACC-123",
      mockToken: "TOKEN-123456"
    });
    expect(JSON.stringify(result.metadata)).toContain("dataKeys");
    expect(JSON.stringify(result.metadata)).not.toContain("not-returned-directly");
  });

  it("fails safely when Accelerate validation rejects a request", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ data: { access_token: "jwt-token" } }))
      .mockResolvedValueOnce(response({ status: "failed", message: "Invalid receiver" }, true, 400));
    const provider = new AccelerateUtilityProvider(config);

    const result = await provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "MTN",
      amountKobo: 50000,
      recipient: "+2348030000000",
      reference: "KGO-UTIL-123",
      totalKobo: 50000
    });

    expect(result.status).toBe(UtilityTransactionStatus.FAILED);
    expect(result.providerStatus).toBe("failed");
    expect(result.failureReason).toBe("Invalid receiver");
  });

  it("maps Accelerate IP allowlist denials to safe customer and admin notes", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ data: { access_token: "jwt-token" } }))
      .mockResolvedValueOnce(response({ message: "Access denied: IP not allowed" }, false, 401));
    const provider = new AccelerateUtilityProvider(config);

    const result = await provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "MTN",
      amountKobo: 50000,
      recipient: "+2348030000000",
      reference: "KGO-UTIL-123",
      totalKobo: 50000
    });

    expect(result).toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      providerStatus: "ACCELERATE_ACCESS_DENIED_IP_ALLOWLIST",
      failureReason: "Utilities provider access is not fully enabled yet. Please try again later.",
      customerNote: "Utilities provider access is not fully enabled yet. Please try again later."
    });
    expect(result.metadata).toMatchObject({
      error: "provider_ip_allowlist_required",
      providerSafeNote: "Provider rejected request because backend IP is not allowlisted."
    });
  });

  it("uses service-specific power requery path for electricity status checks", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ data: { access_token: "jwt-token" } }))
      .mockResolvedValueOnce(response({ status: "processing", data: { transaction_reference: "ACC-123" } }));
    const provider = new AccelerateUtilityProvider(config);

    const result = await provider.checkStatus("ACC-123", UtilityServiceType.ELECTRICITY);

    expect(String(fetchMock.mock.calls[1][0])).toBe("https://test.power.irechargetech.com/api/v2/merchant/power/requery?t_ref=ACC-123");
    expect(result).toMatchObject({
      status: UtilityTransactionStatus.PROCESSING,
      providerStatus: "processing",
      providerReference: "ACC-123"
    });
  });

  it("uses local recipient validation before provider-side validation", async () => {
    const provider = new AccelerateUtilityProvider(config);

    await expect(provider.validateRecipient(UtilityServiceType.AIRTIME, "08030000000")).resolves.toEqual({
      isValid: true,
      normalizedRecipient: "+2348030000000"
    });
    await expect(provider.validateRecipient(UtilityServiceType.CABLE_TV, "123456")).resolves.toEqual({
      isValid: true,
      normalizedRecipient: "123456"
    });
  });
});
