import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { SquadProvider } from "./squad.provider";
import { FlutterwaveProvider } from "./flutterwave.provider";

describe("PAY02 provider isolation contracts (no provider network)", () => {
  const squadSecret = "sandbox_sk_SYNTHETIC_CONTRACT_ONLY";
  const flutterwaveHash = "SYNTHETIC_WEBHOOK_HASH_ONLY";
  function config(selected: string) {
    return new ConfigService({
      PAYMENTS_PROVIDER: selected,
      PAYMENTS_LIVE_ENABLED: "false",
      SQUAD_MODE: "sandbox",
      SQUAD_SECRET_KEY: squadSecret,
      SQUAD_MERCHANT_ID: "SYNTHETIC",
      SQUAD_BASE_URL: "https://sandbox-api-d.squadco.com",
      FLUTTERWAVE_ENVIRONMENT: "live",
      FLUTTERWAVE_API_MODE: "v3",
      FLUTTERWAVE_SECRET_KEY: "SYNTHETIC_NOT_A_REAL_KEY",
      FLUTTERWAVE_SECRET_HASH: flutterwaveHash,
    });
  }
  afterEach(() => jest.restoreAllMocks());
  it("validates raw Squad signatures even when new checkout selects Flutterwave", async () => {
    const p = new SquadProvider(config("flutterwave")),
      body = {
        Event: "charge_successful",
        Body: {
          transaction_ref: "synthetic",
          amount: 100,
          currency: "NGN",
          transaction_status: "Success",
        },
      };
    const rawBody = Buffer.from(JSON.stringify(body)),
      signature = createHmac("sha512", squadSecret)
        .update(rawBody)
        .digest("hex")
        .toUpperCase();
    expect(await p.parseWebhook(body, { rawBody, signature })).toMatchObject({
      verified: true,
      successful: true,
    });
    await expect(
      p.parseWebhook(body, {
        rawBody: Buffer.concat([rawBody, Buffer.from(" ")]),
        signature,
      }),
    ).rejects.toThrow();
    await expect(
      p.parseWebhook(body, { rawBody, signature: flutterwaveHash }),
    ).rejects.toThrow();
  });
  it("validates Flutterwave receipts with Squad selected and routing disabled", async () => {
    const p = new FlutterwaveProvider(config("squad")),
      body = {
        event: "charge.completed",
        data: {
          tx_ref: "synthetic",
          amount: 1,
          currency: "NGN",
          status: "successful",
        },
      };
    const rawBody = Buffer.from(JSON.stringify(body)),
      signature = createHmac("sha256", flutterwaveHash)
        .update(rawBody)
        .digest("base64");
    expect(await p.parseWebhook(body, { rawBody, signature })).toMatchObject({
      verified: true,
      successful: true,
    });
    await expect(
      p.parseWebhook(body, {
        rawBody,
        signature: createHmac("sha512", squadSecret)
          .update(rawBody)
          .digest("hex"),
      }),
    ).rejects.toThrow();
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              tx_ref: "synthetic",
              status: "successful",
              amount: 1,
              currency: "NGN",
            },
          }),
          { status: 200 },
        ),
      );
    expect(await p.verify("synthetic")).toMatchObject({
      successful: true,
      transactionReference: "synthetic",
      amountMinor: 100,
    });
  });
  it("normalizes missing Squad reference and currency without filling expected evidence", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { transaction_status: "Success", transaction_amount: 100 },
          }),
          { status: 200 },
        ),
      );
    expect(
      await new SquadProvider(config("flutterwave")).verify("expected"),
    ).toMatchObject({ transactionReference: "", currency: undefined });
  });
  it("treats Squad refund acknowledgment as pending, never completed", async () => {
    const fetcher = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              gateway_refund_status: "pending",
              refund_status: 2,
              refund_reference: "synthetic-refund",
            },
          }),
          { status: 200 },
        ),
      );
    const result = await new SquadProvider(config("flutterwave")).refund({
      transactionReference: "synthetic",
      providerTransactionReference: "synthetic-gateway",
      amountMinor: 100,
      originalAmountMinor: 100,
      reason: "Synthetic certification",
    });
    expect(result.state).toBe("PENDING");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      refund_type: "Full",
      transaction_ref: "synthetic",
      gateway_transaction_ref: "synthetic-gateway",
    });
  });
});
