import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { MockUtilityProvider } from "./mock-utility.provider";

describe("MockUtilityProvider", () => {
  const provider = new MockUtilityProvider();

  it("normalizes Nigerian phone recipients for airtime and data", async () => {
    await expect(provider.validateRecipient(UtilityServiceType.AIRTIME, "08030000000")).resolves.toMatchObject({
      isValid: true,
      normalizedRecipient: "+2348030000000"
    });
    await expect(provider.validateRecipient(UtilityServiceType.DATA, "+2348030000000")).resolves.toMatchObject({
      isValid: true,
      normalizedRecipient: "+2348030000000"
    });
  });

  it("rejects invalid recipients safely", async () => {
    await expect(provider.validateRecipient(UtilityServiceType.AIRTIME, "123")).resolves.toMatchObject({
      isValid: false
    });
    await expect(provider.validateRecipient(UtilityServiceType.CABLE_TV, "12")).resolves.toMatchObject({
      isValid: false
    });
  });

  it("returns successful mock responses and fictional electricity token", async () => {
    await expect(provider.purchase({
      serviceType: UtilityServiceType.ELECTRICITY,
      providerCode: "DEMO_KEDCO_PROVIDER",
      productCode: "DEMO_KEDCO_PREPAID",
      amountKobo: 500000,
      totalKobo: 500000,
      recipient: "12345678901",
      reference: "KGO-UTIL-12345678"
    })).resolves.toMatchObject({
      status: UtilityTransactionStatus.SUCCESSFUL,
      providerStatus: "MOCK_SUCCESSFUL",
      mockToken: "KGO-TEST-1234-5678"
    });
  });

  it("simulates failure for the staging test amount", async () => {
    await expect(provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "DEMO_MTN_AIRTIME_PROVIDER",
      amountKobo: 99999,
      totalKobo: 99999,
      recipient: "+2348030000000",
      reference: "KGO-UTIL-FAIL"
    })).resolves.toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      providerStatus: "MOCK_FAILED"
    });
  });
});
