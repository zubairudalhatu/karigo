import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { SquadProvider } from "./squad.provider";

describe("SquadProvider", () => {
  const secret = "sandbox_sk_not-a-real-key";
  const defaultConfigGet = (key: string, fallback?: string) => {
    if (key === "SQUAD_SECRET_KEY") return secret;
    if (key === "SQUAD_WEBHOOK_SECRET") return secret;
    if (key === "SQUAD_BASE_URL") return "https://sandbox-api-d.squadco.com";
    if (key === "SQUAD_MODE") return "test";
    if (key === "PAYMENTS_LIVE_ENABLED") return "false";
    return fallback;
  };
  const config = {
    get: jest.fn(defaultConfigGet)
  };
  const provider = new SquadProvider(config as unknown as ConfigService);

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockImplementation(defaultConfigGet);
  });

  it("initializes a sandbox checkout transaction in kobo without exposing secrets", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: 200,
      success: true,
      message: "success",
      data: {
        checkout_url: "https://sandbox-pay.squadco.com/KGO-SQUAD-123",
        access_token: "squad-access",
        transaction_ref: "KGO-SQUAD-123"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await provider.initialize({
      transactionReference: "KGO-SQUAD-123",
      amount: "6000.50",
      currency: "NGN",
      customerEmail: "customer@example.com",
      customerPhone: "+2348012345678",
      metadata: { orderId: "order-1" }
    });

    expect(fetchMock).toHaveBeenCalledWith("https://sandbox-api-d.squadco.com/transaction/initiate", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: `Bearer ${secret}` })
    }));
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string);
    expect(body.amount).toBe(600050);
    expect(body.transaction_ref).toBe("KGO-SQUAD-123");
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.authorizationUrl).toBe("https://sandbox-pay.squadco.com/KGO-SQUAD-123");
  });

  it("returns amount and currency evidence from verification", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: 200,
      success: true,
      message: "Success",
      data: {
        transaction_ref: "KGO-SQUAD-123",
        transaction_status: "Success",
        transaction_amount: 600000,
        transaction_currency_id: "NGN"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(provider.verify("KGO-SQUAD-123")).resolves.toEqual(expect.objectContaining({
      successful: true,
      amountMinor: 600000,
      currency: "NGN"
    }));
  });

  it("accepts a correctly signed charge_successful webhook", async () => {
    const payload = {
      Event: "charge_successful",
      TransactionRef: "KGO-SQUAD-123",
      Body: {
        amount: 600000,
        transaction_ref: "KGO-SQUAD-123",
        transaction_status: "Success",
        currency: "NGN"
      }
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac("sha512", secret).update(rawBody).digest("hex").toUpperCase();

    const result = await provider.parseWebhook(payload, { rawBody, signature });
    expect(result).toEqual(expect.objectContaining({
      verified: true,
      successful: true,
      transactionReference: "KGO-SQUAD-123",
      amountMinor: 600000
    }));
  });

  it("rejects an invalid Squad webhook signature", async () => {
    const payload = { Event: "charge_successful", Body: { transaction_ref: "KGO-SQUAD-123" } };
    await expect(provider.parseWebhook(payload, {
      rawBody: Buffer.from(JSON.stringify(payload)),
      signature: "invalid"
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires explicit Squad sandbox mode before contacting Squad", async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === "SQUAD_SECRET_KEY") return secret;
      if (key === "SQUAD_BASE_URL") return "https://sandbox-api-d.squadco.com";
      if (key === "SQUAD_MODE") return undefined;
      if (key === "PAYMENTS_LIVE_ENABLED") return "false";
      return fallback;
    });

    await expect(provider.verify("KGO-SQUAD-123"))
      .rejects.toThrow("missing SQUAD_MODE=test or sandbox");
  });

  it("uses a generated sandbox email when a customer email is unavailable", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: 200,
      success: true,
      message: "success",
      data: {
        checkout_url: "https://sandbox-pay.squadco.com/KGO-SQUAD-123",
        access_token: "squad-access",
        transaction_ref: "KGO-SQUAD-123"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await provider.initialize({
      transactionReference: "KGO-SQUAD-123",
      amount: "6000.00",
      currency: "NGN",
      customerPhone: "+2348012345678",
      metadata: {}
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string);
    expect(body.email).toBe("checkout+kgo-squad-123@sandbox.karigo.com.ng");
  });
});
