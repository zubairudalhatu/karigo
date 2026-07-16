import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { MonnifyProvider } from "./monnify.provider";

describe("MonnifyProvider", () => {
  const secret = "monnify-test-secret-not-real";
  const defaultConfigGet = (key: string, fallback?: string) => {
    if (key === "MONNIFY_API_KEY") return "monnify-test-api-key-not-real";
    if (key === "MONNIFY_SECRET_KEY") return secret;
    if (key === "MONNIFY_WEBHOOK_SECRET") return secret;
    if (key === "MONNIFY_CONTRACT_CODE") return "1234567890";
    if (key === "MONNIFY_BASE_URL") return "https://sandbox.monnify.com";
    if (key === "MONNIFY_MODE") return "test";
    if (key === "PAYMENTS_LIVE_ENABLED") return "false";
    return fallback;
  };
  const config = {
    get: jest.fn(defaultConfigGet)
  };
  const provider = new MonnifyProvider(config as unknown as ConfigService);

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockImplementation(defaultConfigGet);
  });

  it("initializes a sandbox hosted-checkout transaction without exposing secrets", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: { accessToken: "monnify-access-token" }
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: {
          paymentReference: "KGO-MONNIFY-123",
          transactionReference: "MNFY-123",
          checkoutUrl: "https://sandbox.monnify.com/checkout/KGO-MONNIFY-123"
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await provider.initialize({
      transactionReference: "KGO-MONNIFY-123",
      amount: "6000.50",
      currency: "NGN",
      customerEmail: "customer@example.com",
      customerPhone: "+2348012345678",
      metadata: { orderId: "order-1" }
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sandbox.monnify.com/api/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer monnify-access-token" })
      })
    );
    const initBody = JSON.parse((fetchMock as jest.Mock).mock.calls[1][1].body);
    expect(initBody.amount).toBe(6000.5);
    expect(initBody.paymentReference).toBe("KGO-MONNIFY-123");
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.authorizationUrl).toBe("https://sandbox.monnify.com/checkout/KGO-MONNIFY-123");
  });

  it("returns amount and currency evidence from verification", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: { accessToken: "monnify-access-token" }
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: {
          paymentReference: "KGO-MONNIFY-123",
          paymentStatus: "PAID",
          amountPaid: 6000,
          currencyCode: "NGN"
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(provider.verify("KGO-MONNIFY-123")).resolves.toEqual(expect.objectContaining({
      successful: true,
      amountMinor: 600000,
      currency: "NGN"
    }));
  });

  it("accepts a correctly signed successful collection webhook", async () => {
    const payload = {
      eventType: "SUCCESSFUL_TRANSACTION",
      eventData: {
        paymentReference: "KGO-MONNIFY-123",
        paymentStatus: "PAID",
        amountPaid: 6000,
        currencyCode: "NGN"
      }
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac("sha512", secret).update(rawBody).digest("hex");

    const result = await provider.parseWebhook(payload, { rawBody, signature });
    expect(result).toEqual(expect.objectContaining({
      verified: true,
      successful: true,
      transactionReference: "KGO-MONNIFY-123",
      amountMinor: 600000
    }));
  });

  it("rejects an invalid Monnify webhook signature", async () => {
    const payload = { eventType: "SUCCESSFUL_TRANSACTION", eventData: { paymentReference: "KGO-MONNIFY-123" } };
    await expect(provider.parseWebhook(payload, {
      rawBody: Buffer.from(JSON.stringify(payload)),
      signature: "invalid"
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires explicit Monnify sandbox mode before contacting Monnify", async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === "MONNIFY_API_KEY") return "monnify-test-api-key-not-real";
      if (key === "MONNIFY_SECRET_KEY") return secret;
      if (key === "MONNIFY_CONTRACT_CODE") return "1234567890";
      if (key === "MONNIFY_BASE_URL") return "https://sandbox.monnify.com";
      if (key === "MONNIFY_MODE") return undefined;
      if (key === "PAYMENTS_LIVE_ENABLED") return "false";
      return fallback;
    });

    await expect(provider.verify("KGO-MONNIFY-123"))
      .rejects.toThrow("Monnify sandbox mode must be explicitly enabled");
  });

  it("uses a generated sandbox email when a customer email is unavailable", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: { accessToken: "monnify-access-token" }
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestSuccessful: true,
        responseBody: {
          paymentReference: "KGO-MONNIFY-123",
          transactionReference: "MNFY-123",
          checkoutUrl: "https://sandbox.monnify.com/checkout/KGO-MONNIFY-123"
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await provider.initialize({
      transactionReference: "KGO-MONNIFY-123",
      amount: "6000.00",
      currency: "NGN",
      customerPhone: "+2348012345678",
      metadata: {}
    });

    const initBody = JSON.parse((fetchMock as jest.Mock).mock.calls[1][1].body);
    expect(initBody.customerEmail).toBe("checkout+kgo-monnify-123@sandbox.karigo.com.ng");
    expect(initBody.customerName).toBe("checkout+kgo-monnify-123@sandbox.karigo.com.ng");
  });
});
