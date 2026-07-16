import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { PaystackProvider } from "./paystack.provider";

describe("PaystackProvider", () => {
  const secret = ["sk", "test", "not-a-real-key"].join("_");
  const defaultConfigGet = (key: string, fallback?: string) => {
    if (key === "PAYSTACK_SECRET_KEY") return secret;
    if (key === "PAYSTACK_WEBHOOK_SECRET") return secret;
    if (key === "PAYSTACK_BASE_URL") return "https://api.paystack.co";
    if (key === "PAYSTACK_MODE") return "test";
    if (key === "PAYMENTS_LIVE_ENABLED") return "false";
    return fallback;
  };
  const config = {
    get: jest.fn(defaultConfigGet),
    getOrThrow: jest.fn(() => secret)
  };
  const provider = new PaystackProvider(config as unknown as ConfigService);

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockImplementation(defaultConfigGet);
  });

  it("initializes a sandbox transaction in kobo without exposing the secret", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test",
        access_code: "test-access",
        reference: "KGO-PAYSTACK-123"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await provider.initialize({
      transactionReference: "KGO-PAYSTACK-123",
      amount: "6000.50",
      currency: "NGN",
      customerEmail: "customer@example.com",
      customerPhone: "+2348012345678",
      metadata: { orderId: "order-1" }
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.paystack.co/transaction/initialize", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"amount\":600050")
    }));
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/test");
  });

  it("uses a generated sandbox email when a customer email is unavailable", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test",
        access_code: "test-access",
        reference: "KGO-PAYSTACK-123"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await provider.initialize({
      transactionReference: "KGO-PAYSTACK-123",
      amount: "6000.00",
      currency: "NGN",
      customerPhone: "+2348012345678",
      metadata: {}
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string);
    expect(body.email).toBe("checkout+kgo-paystack-123@sandbox.karigo.com.ng");
  });

  it("returns amount and currency evidence from verification", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: true,
      data: { reference: "KGO-PAYSTACK-123", status: "success", amount: 600000, currency: "NGN" }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(provider.verify("KGO-PAYSTACK-123")).resolves.toEqual(expect.objectContaining({
      successful: true,
      amountMinor: 600000,
      currency: "NGN"
    }));
  });

  it("accepts a correctly signed charge.success webhook", async () => {
    const payload = { event: "charge.success", data: { reference: "KGO-PAYSTACK-123", status: "success", amount: 600000, currency: "NGN" } };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac("sha512", secret).update(rawBody).digest("hex");

    const result = await provider.parseWebhook(payload, { rawBody, signature });
    expect(result).toEqual(expect.objectContaining({
      verified: true,
      successful: true,
      transactionReference: "KGO-PAYSTACK-123",
      amountMinor: 600000
    }));
    expect(result.providerResponse).toEqual(payload);
    expect(result.providerResponse).not.toHaveProperty("_rawBody");
  });

  it("rejects an invalid webhook signature", async () => {
    const payload = { event: "charge.success", data: { reference: "KGO-PAYSTACK-123" } };
    await expect(provider.parseWebhook(payload, {
      rawBody: Buffer.from(JSON.stringify(payload)),
      signature: "invalid"
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires explicit Paystack Test Mode before contacting Paystack", async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === "PAYSTACK_SECRET_KEY") return secret;
      if (key === "PAYSTACK_WEBHOOK_SECRET") return secret;
      if (key === "PAYSTACK_BASE_URL") return "https://api.paystack.co";
      if (key === "PAYSTACK_MODE") return undefined;
      if (key === "PAYMENTS_LIVE_ENABLED") return "false";
      return fallback;
    });

    await expect(provider.verify("KGO-PAYSTACK-123"))
      .rejects.toThrow("Paystack Test Mode must be explicitly enabled");
  });

  it("rejects non-test Paystack secret keys", async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === "PAYSTACK_SECRET_KEY") return ["sk", "live", "not-a-real-key"].join("_");
      if (key === "PAYSTACK_WEBHOOK_SECRET") return secret;
      if (key === "PAYSTACK_BASE_URL") return "https://api.paystack.co";
      if (key === "PAYSTACK_MODE") return "test";
      if (key === "PAYMENTS_LIVE_ENABLED") return "false";
      return fallback;
    });

    await expect(provider.verify("KGO-PAYSTACK-123"))
      .rejects.toThrow("Paystack Test Mode requires a test secret key");
  });
});
