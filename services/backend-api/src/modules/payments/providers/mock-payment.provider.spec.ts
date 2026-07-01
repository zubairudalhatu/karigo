import { MockPaymentProvider } from "./mock-payment.provider";

describe("MockPaymentProvider", () => {
  const provider = new MockPaymentProvider();

  it("returns a development authorization response", async () => {
    const result = await provider.initialize({
      transactionReference: "KGO-MOCK-123",
      amount: "6000.00",
      currency: "NGN",
      customerPhone: "+2348012345678",
      metadata: { orderId: "order-1" }
    });

    expect(result.authorizationUrl).toBe("mock://payment/KGO-MOCK-123");
    expect(result.providerResponse.status).toBe("pending");
  });

  it("parses a successful simulated webhook", async () => {
    const result = await provider.parseWebhook({
      transactionReference: "KGO-MOCK-123",
      status: "successful"
    });

    expect(result.verified).toBe(true);
    expect(result.successful).toBe(true);
    expect(result.transactionReference).toBe("KGO-MOCK-123");
  });
});

