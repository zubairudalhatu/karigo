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
        ACCELERATE_BASE_URL: "https://api.accelerate.example",
        ACCELERATE_API_KEY: "accelerate-api-key-placeholder"
      };
      return values[key];
    })
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("normalizes successful provider purchase responses without exposing raw payloads", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response({
      status: "success",
      message: "Processed",
      data: {
        reference: "ACC-123",
        token: "TOKEN-123456",
        transactionStatus: "successful",
        privateField: "not-returned-directly"
      }
    }));
    const provider = new AccelerateUtilityProvider(config);

    const result = await provider.purchase({
      serviceType: UtilityServiceType.ELECTRICITY,
      providerCode: "KEDCO",
      amountKobo: 100000,
      recipient: "1234567890",
      reference: "KGO-UTIL-123",
      totalKobo: 100000
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

  it("fails safely when provider submission fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response({ message: "Rejected by provider" }, false, 400));
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
    expect(result.providerStatus).toBe("ACCELERATE_SUBMISSION_FAILED");
    expect(result.failureReason).toBe("Utilities provider submission could not be completed safely.");
  });

  it("uses local recipient validation when no provider validation path is configured", async () => {
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
