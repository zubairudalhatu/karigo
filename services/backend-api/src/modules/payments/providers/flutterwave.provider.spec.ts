import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { FlutterwaveProvider } from "./flutterwave.provider";

describe("FlutterwaveProvider", () => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, string> = {
        PAYMENTS_LIVE_ENABLED: "true",
        PAYMENTS_PROVIDER: "flutterwave",
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_SECRET_KEY: "live-flutterwave-secret-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "flutterwave-webhook-hash-placeholder"
      };
      return values[key] ?? fallback;
    })
  };
  const provider = new FlutterwaveProvider(config as unknown as ConfigService);
  const fetchMock = jest.fn();
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
    loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("initializes a live hosted checkout and returns only a secure external URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        message: "Payment link created",
        data: {
          tx_ref: "KGO-FLUTTERWAVE-123",
          flw_ref: "FLW-123",
          link: "https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-123"
        }
      })
    });

    const result = await provider.initialize({
      transactionReference: "KGO-FLUTTERWAVE-123",
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: { orderId: "order-1" }
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.flutterwave.com/v3/payments", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer live-flutterwave-secret-placeholder"
      })
    }));
    expect(result.transactionReference).toBe("KGO-FLUTTERWAVE-123");
    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-123");
    expect(JSON.stringify(result)).not.toContain("FLUTTERWAVE_SECRET_KEY");
  });

  it("extracts Flutterwave Standard data.link hosted checkout URLs", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        message: "Hosted Link",
        data: {
          link: "https://checkout.flutterwave.com/v3/hosted/pay/test-link"
        }
      })
    });

    const result = await provider.initialize({
      transactionReference: "KGO-FLUTTERWAVE-LINK",
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: { orderId: "order-1" }
    });

    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/test-link");
    expect(result.transactionReference).toBe("KGO-FLUTTERWAVE-LINK");
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("checkoutLinkAlias=data.link"));
  });

  it("accepts safe hosted checkout URL aliases without exposing provider payloads", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        checkoutUrl: "https://checkout.flutterwave.com/v3/hosted/pay/top-level-link"
      })
    });

    const result = await provider.initialize({
      transactionReference: "KGO-FLUTTERWAVE-ALIAS",
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: {}
    });

    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/top-level-link");
  });

  it("rejects initialization responses without a secure checkout URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        data: { tx_ref: "KGO-FLUTTERWAVE-123", link: "http://checkout.flutterwave.com/not-secure" }
      })
    });

    await expect(provider.initialize({
      transactionReference: "KGO-FLUTTERWAVE-123",
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: {}
    })).rejects.toThrow("Flutterwave checkout link was not returned");
  });

  it("returns safe missing-link diagnostics without logging secrets, hosted URLs or raw payload values", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        message: "Hosted Link",
        data: {
          tx_ref: "KGO-FLUTTERWAVE-NO-LINK",
          link: "http://checkout.flutterwave.com/not-secure"
        }
      })
    });

    await expect(provider.initialize({
      transactionReference: "KGO-FLUTTERWAVE-NO-LINK",
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: {}
    })).rejects.toMatchObject({
      diagnostic: {
        code: "FLUTTERWAVE_CHECKOUT_LINK_MISSING",
        httpStatusCode: 200,
        safeDiagnostics: {
          responseKeys: ["data", "message", "status"],
          dataKeys: ["link", "tx_ref"],
          statusCode: 200
        }
      }
    });

    const logs = loggerSpy.mock.calls.flat().join("\n");
    expect(logs).toContain("checkoutLinkFound=false");
    expect(logs).toContain("checkoutLinkAlias=none");
    expect(logs).toContain("baseHost=api.flutterwave.com");
    expect(logs).not.toContain("live-flutterwave-secret-placeholder");
    expect(logs).not.toContain("checkout.flutterwave.com/not-secure");
    expect(logs).not.toContain("Hosted Link");
  });

  it("verifies payment evidence by reference without marking success client-side", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        data: {
          tx_ref: "KGO-FLUTTERWAVE-VERIFY",
          status: "successful",
          amount: 3500,
          currency: "NGN"
        }
      })
    });

    const result = await provider.verify("KGO-FLUTTERWAVE-VERIFY");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=KGO-FLUTTERWAVE-VERIFY",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual(expect.objectContaining({
      transactionReference: "KGO-FLUTTERWAVE-VERIFY",
      successful: true,
      amountMinor: 350000,
      currency: "NGN"
    }));
  });

  it("accepts a verified Flutterwave webhook signature", async () => {
    const payload = {
      event: "charge.completed",
      data: {
        tx_ref: "KGO-FLUTTERWAVE-WEBHOOK",
        status: "successful",
        amount: 3500,
        currency: "NGN"
      }
    };

    const result = await provider.parseWebhook(payload, {
      rawBody: Buffer.from(JSON.stringify(payload)),
      signature: "flutterwave-webhook-hash-placeholder"
    });

    expect(result).toEqual(expect.objectContaining({
      transactionReference: "KGO-FLUTTERWAVE-WEBHOOK",
      successful: true,
      verified: true,
      amountMinor: 350000,
      currency: "NGN"
    }));
  });

  it("accepts an HMAC Flutterwave webhook signature when supplied", async () => {
    const rawBody = Buffer.from("{\"event\":\"charge.completed\"}");
    const signature = createHmac("sha256", "flutterwave-webhook-hash-placeholder").update(rawBody).digest("base64");

    await expect(provider.parseWebhook({ event: "charge.completed" }, { rawBody, signature }))
      .resolves.toEqual(expect.objectContaining({ verified: true }));
  });

  it("rejects invalid Flutterwave webhook signatures", async () => {
    await expect(provider.parseWebhook({}, {
      rawBody: Buffer.from("{}"),
      signature: "invalid"
    })).rejects.toThrow("Invalid Flutterwave webhook signature");
  });
});
