import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { PaybetaUtilityProvider } from "./paybeta-utility.provider";

function response(payload: unknown, status = 200): Response {
  return { status, json: jest.fn().mockResolvedValue(payload) } as unknown as Response;
}

function config(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    PAYBETA_BASE_URL: "https://api.sandbox.paybeta.ng",
    PAYBETA_API_KEY: "pb_test_placeholder_not_a_real_secret",
    PAYBETA_TIMEOUT_MS: 1000,
    PAYBETA_RETRY_ATTEMPTS: 2,
    PAYBETA_RETRY_DELAY_MS: 0,
    ...overrides
  };
  return { get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback) } as unknown as ConfigService;
}

describe("PaybetaUtilityProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses only the P-API-KEY header against the sandbox host", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({
      status: "successful",
      data: [{ name: "MTN VTU", category: "airtime", status: true }]
    }));
    const provider = new PaybetaUtilityProvider(config({ PAYBETA_SECRET_KEY: "must-not-be-used" }));

    const providers = await provider.listProviders(UtilityServiceType.AIRTIME);

    expect(providers).toEqual([{ name: "MTN VTU", code: "mtn_vtu", active: true }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.sandbox.paybeta.ng/v2/airtime/providers");
    expect((init?.headers as Record<string, string>)["P-API-KEY"]).toBe("pb_test_placeholder_not_a_real_secret");
    expect(JSON.stringify(init?.headers)).not.toContain("must-not-be-used");
  });

  it("retries safe catalogue requests within the configured bound", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(response({ status: "successful", data: [] }));
    const provider = new PaybetaUtilityProvider(config());

    await expect(provider.listProviders(UtilityServiceType.CABLE_TV)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes data products into KariGO catalogue contracts", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({
      status: "successful",
      data: { packages: [{ code: "MT1", description: "MTN 100MB", price: "100.00" }] }
    }));
    const provider = new PaybetaUtilityProvider(config());

    await expect(provider.listProducts(UtilityServiceType.DATA, "mtn-data")).resolves.toEqual([
      { code: "MT1", name: "MTN 100MB", amountKobo: 10_000 }
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.sandbox.paybeta.ng/v2/data-bundle/list?service=mtn_data");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("GET");
  });

  it("normalizes successful, pending and failed Paybeta results", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ status: "successful", data: { reference: "KGO-1", transactionId: "PB-1" } }))
      .mockResolvedValueOnce(response({ status: "pending", code: "01", data: { reference: "KGO-2" } }))
      .mockResolvedValueOnce(response({ status: "failed", code: "02", data: { reference: "KGO-3" } }));
    const provider = new PaybetaUtilityProvider(config());
    const base = { serviceType: UtilityServiceType.AIRTIME, providerCode: "mtn_vtu", amountKobo: 10_000, totalKobo: 10_000, recipient: "08030000000" };

    const success = await provider.purchase({ ...base, reference: "KGO-1" });
    const pending = await provider.purchase({ ...base, reference: "KGO-2" });
    const failed = await provider.purchase({ ...base, reference: "KGO-3" });

    expect(success.status).toBe(UtilityTransactionStatus.SUCCESSFUL);
    expect(pending.status).toBe(UtilityTransactionStatus.PROCESSING);
    expect(failed.status).toBe(UtilityTransactionStatus.FAILED);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never repurchases a pending reference", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({ status: "pending", code: "01", data: { reference: "KGO-PENDING" } }));
    const provider = new PaybetaUtilityProvider(config());
    const input = { serviceType: UtilityServiceType.AIRTIME, providerCode: "mtn_vtu", amountKobo: 10_000, totalKobo: 10_000, recipient: "08030000000", reference: "KGO-PENDING" };

    const first = await provider.purchase(input);
    const duplicate = await provider.purchase(input);

    expect(first.status).toBe(UtilityTransactionStatus.PROCESSING);
    expect(duplicate.providerStatus).toBe("PAYBETA_DUPLICATE_REFERENCE_BLOCKED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a second submission after a successful reference", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({
      status: "successful",
      code: "00",
      data: { reference: "KGO-IDEMPOTENT" }
    }));
    const provider = new PaybetaUtilityProvider(config());
    const input = {
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "mtn_vtu",
      amountKobo: 10_000,
      totalKobo: 10_000,
      recipient: "08030000000",
      reference: "KGO-IDEMPOTENT"
    };

    await expect(provider.purchase(input)).resolves.toMatchObject({ status: UtilityTransactionStatus.SUCCESSFUL });
    await expect(provider.purchase(input)).resolves.toMatchObject({ providerStatus: "PAYBETA_DUPLICATE_REFERENCE_BLOCKED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates electricity and forwards only the provider-required customer fields", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({
        status: "successful",
        data: { customerName: "Sandbox Customer", customerAddress: "Sandbox Address" }
      }))
      .mockResolvedValueOnce(response({
        status: "successful",
        data: { reference: "KGO-ELECTRICITY", token: "sandbox-token" }
      }));
    const provider = new PaybetaUtilityProvider(config());

    const result = await provider.purchase({
      serviceType: UtilityServiceType.ELECTRICITY,
      providerCode: "ikeja-electric",
      amountKobo: 200_000,
      totalKobo: 200_000,
      recipient: "0111100049",
      meterType: "PREPAID",
      reference: "KGO-ELECTRICITY"
    });

    expect(result.status).toBe(UtilityTransactionStatus.SUCCESSFUL);
    const purchaseBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(purchaseBody).toMatchObject({
      customerName: "Sandbox Customer",
      customerAddress: "Sandbox Address",
      meterNumber: "0111100049",
      amount: 2000
    });
    expect(purchaseBody).not.toHaveProperty("apiKey");
  });

  it("does not retry an ambiguous purchase timeout", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockRejectedValue(new DOMException("timed out", "AbortError"));
    const provider = new PaybetaUtilityProvider(config());

    const result = await provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "mtn_vtu",
      amountKobo: 10_000,
      totalKobo: 10_000,
      recipient: "08030000000",
      reference: "KGO-TIMEOUT"
    });

    expect(result).toMatchObject({ status: UtilityTransactionStatus.PROCESSING, providerStatus: "PAYBETA_SUBMISSION_UNCONFIRMED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats provider authentication rejection as a definitive failure", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({ message: "Unauthorized" }, 401));
    const provider = new PaybetaUtilityProvider(config());

    const result = await provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "mtn_vtu",
      amountKobo: 10_000,
      totalKobo: 10_000,
      recipient: "08030000000",
      reference: "KGO-AUTH-FAILURE"
    });

    expect(result).toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      providerStatus: "PAYBETA_HTTP_401",
      providerReference: "KGO-AUTH-FAILURE"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats accepted validation HTTP 4xx responses as definitive failures", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(response({ status: "pending", message: "Invalid request" }, 422));
    const provider = new PaybetaUtilityProvider(config());

    const result = await provider.purchase({
      serviceType: UtilityServiceType.AIRTIME,
      providerCode: "mtn_vtu",
      amountKobo: 10_000,
      totalKobo: 10_000,
      recipient: "08030000000",
      reference: "KGO-VALIDATION-FAILURE"
    });

    expect(result).toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      providerStatus: "PAYBETA_HTTP_422"
    });
  });

  it("performs bounded status reconciliation without invoking purchase", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ status: "pending", code: "01", data: { reference: "KGO-QUERY" } }))
      .mockResolvedValueOnce(response({ status: "successful", code: "00", data: { reference: "KGO-QUERY" } }));
    const provider = new PaybetaUtilityProvider(config());

    const result = await provider.reconcileStatus("KGO-QUERY", UtilityServiceType.DATA, { maxAttempts: 2, initialDelayMs: 0, intervalMs: 0 });

    expect(result.status).toBe(UtilityTransactionStatus.SUCCESSFUL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith("/v2/transaction/query"))).toBe(true);
  });

  it("keeps credentials out of logs and leaves webhooks disabled without documented authentication", async () => {
    const secret = "pb_test_sensitive_placeholder";
    jest.spyOn(global, "fetch").mockRejectedValue(new Error(secret));
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const provider = new PaybetaUtilityProvider(config({ PAYBETA_API_KEY: secret }));

    await provider.checkStatus("KGO-SAFE", UtilityServiceType.AIRTIME);

    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
    expect(provider.webhookAuthenticationStatus()).toMatchObject({ documented: false, enabled: false });
  });

  it("accepts the exact production host and posts data discovery", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response({
      status: "successful",
      data: { packages: [{ code: "A1", description: "Airtel test bundle", price: "100" }] }
    }));
    const provider = new PaybetaUtilityProvider(config({ PAYBETA_BASE_URL: "https://api.paybeta.ng" }));

    expect(provider.isConfigured("production")).toBe(true);
    await provider.listProducts(UtilityServiceType.DATA, "airtel-data");
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.paybeta.ng/v2/data-bundle/list");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ service: "airtel_data" })
    });
  });
});
