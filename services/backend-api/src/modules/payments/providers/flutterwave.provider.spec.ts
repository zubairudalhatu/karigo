import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { FlutterwaveProvider } from "./flutterwave.provider";

describe("FlutterwaveProvider", () => {
  let configValues: Record<string, string>;
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      return configValues[key] ?? fallback;
    })
  };
  const fetchMock = jest.fn();
  let provider: FlutterwaveProvider;
  let loggerSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  function tokenResponse(token = "flutterwave-access-token", expiresIn = 600) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: token,
        expires_in: expiresIn,
        token_type: "Bearer"
      })
    };
  }

  function hostedCheckoutResponse(link = "https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-123") {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: "success",
        message: "Payment link created",
        data: {
          tx_ref: "KGO-FLUTTERWAVE-123",
          flw_ref: "FLW-123",
          link
        }
      })
    };
  }

  function initializationInput(reference = "KGO-FLUTTERWAVE-123") {
    return {
      transactionReference: reference,
      amount: "3500.00",
      currency: "NGN",
      customerEmail: "customer@example.test",
      customerPhone: "+2348000000000",
      metadata: { orderId: "order-1" }
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configValues = {
      PAYMENTS_LIVE_ENABLED: "true",
      PAYMENTS_PROVIDER: "flutterwave",
      FLUTTERWAVE_ENVIRONMENT: "live",
      FLUTTERWAVE_API_MODE: "v3",
      FLUTTERWAVE_SECRET_KEY: "flutterwave-secret-key-placeholder",
      FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
      FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
      FLUTTERWAVE_SECRET_HASH: "flutterwave-webhook-hash-placeholder"
    };
    provider = new FlutterwaveProvider(config as unknown as ConfigService);
    global.fetch = fetchMock as never;
    loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    loggerWarnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("uses v3 Standard checkout with the server-side secret key for hosted payment links", async () => {
    fetchMock.mockResolvedValueOnce(hostedCheckoutResponse());

    const result = await provider.initialize(initializationInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.flutterwave.com/v3/payments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer flutterwave-secret-key-placeholder"
        })
      })
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual(expect.objectContaining({
      tx_ref: "KGO-FLUTTERWAVE-123",
      amount: "3500.00",
      currency: "NGN",
      redirect_url: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave"
    }));
    expect(body).not.toHaveProperty("reference");
    expect(result.transactionReference).toBe("KGO-FLUTTERWAVE-123");
    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-123");
  });

  it("uses v4 OAuth and a non-payments endpoint only when FLUTTERWAVE_API_MODE=v4", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(hostedCheckoutResponse());

    await provider.initialize(initializationInput());

    expect(fetchMock).toHaveBeenNthCalledWith(1,
      "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock.mock.calls[1][0]).toBe("https://f4bexperience.flutterwave.com/orders");
    expect(fetchMock.mock.calls[1][0]).not.toContain("/payments");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer flutterwave-access-token");
  });

  it("caches the v4 access token until expiry instead of requesting a token for every checkout", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(hostedCheckoutResponse("https://checkout.flutterwave.com/v3/hosted/pay/first"))
      .mockResolvedValueOnce(hostedCheckoutResponse("https://checkout.flutterwave.com/v3/hosted/pay/second"));

    await provider.initialize(initializationInput("KGO-FLUTTERWAVE-FIRST"));
    await provider.initialize(initializationInput("KGO-FLUTTERWAVE-SECOND"));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer flutterwave-access-token");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer flutterwave-access-token");
  });

  it("refreshes the token once and retries checkout initialization after a 401", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock
      .mockResolvedValueOnce(tokenResponse("expired-token"))
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauthorized", status: "failed" })
      })
      .mockResolvedValueOnce(tokenResponse("fresh-token"))
      .mockResolvedValueOnce(hostedCheckoutResponse("https://checkout.flutterwave.com/v3/hosted/pay/retry-success"));

    const result = await provider.initialize(initializationInput("KGO-FLUTTERWAVE-RETRY"));

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer expired-token");
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer fresh-token");
    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/retry-success");
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining("tokenRefreshAttempted=true"));
  });

  it("returns a structured auth failure when the access token cannot be fetched", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "invalid_client", status: "failed" })
    });

    await expect(provider.initialize(initializationInput("KGO-FLUTTERWAVE-AUTH-FAIL")))
      .rejects.toMatchObject({
        diagnostic: {
          provider: "flutterwave",
          stage: "auth-token",
          code: "FLUTTERWAVE_AUTH_FAILED",
          message: "Flutterwave authentication failed.",
          httpStatusCode: 401,
          safeDiagnostics: {
            responseKeys: ["error", "status"],
            statusCode: 401,
            tokenFetched: false
          }
        }
      });
  });

  it("extracts Flutterwave Standard data.link hosted checkout URLs", async () => {
    fetchMock
      .mockResolvedValueOnce({
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

    const result = await provider.initialize(initializationInput("KGO-FLUTTERWAVE-LINK"));

    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/test-link");
    expect(result.transactionReference).toBe("KGO-FLUTTERWAVE-LINK");
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("linkAlias=data.link"));
  });

  it("returns a safe v3 authentication error when Standard checkout returns 401", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ status: "error", message: "Unauthenticated" })
    });

    await expect(provider.initialize(initializationInput("KGO-FLUTTERWAVE-V3-AUTH")))
      .rejects.toMatchObject({
        diagnostic: {
          provider: "flutterwave",
          stage: "initialize-transaction",
          code: "FLUTTERWAVE_AUTH_FAILED",
          message: "Flutterwave authentication failed.",
          httpStatusCode: 401,
          safeDiagnostics: {
            responseKeys: ["message", "status"],
            dataKeys: [],
            statusCode: 401
          }
        }
      });
  });

  it("rejects v4 configuration that tries to use the v3 /payments checkout path", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    configValues.FLUTTERWAVE_V4_CHECKOUT_PATH = "/payments";

    await expect(provider.initialize(initializationInput("KGO-FLUTTERWAVE-V4-PAYMENTS")))
      .rejects.toMatchObject({
        diagnostic: {
          code: "FLUTTERWAVE_ENDPOINT_NOT_FOUND",
          stage: "config-read",
          message: "Flutterwave checkout endpoint is not configured for this API mode.",
          safeDiagnostics: expect.objectContaining({
            apiMode: "v4",
            path: "/payments"
          })
        }
      });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe endpoint/config error when v4 checkout endpoint is not found", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "not_found", status: "failed" })
      });

    await expect(provider.initialize(initializationInput("KGO-FLUTTERWAVE-V4-404")))
      .rejects.toMatchObject({
        diagnostic: {
          code: "FLUTTERWAVE_ENDPOINT_NOT_FOUND",
          stage: "initialize-transaction",
          message: "Flutterwave checkout endpoint is not configured for this API mode.",
          httpStatusCode: 404,
          safeDiagnostics: {
            responseKeys: ["error", "status"],
            dataKeys: [],
            statusCode: 404
          }
        }
      });
    expect(fetchMock.mock.calls[1][0]).toBe("https://f4bexperience.flutterwave.com/orders");
  });

  it("extracts v4 redirect URLs from next_action when a v4 flow returns one", async () => {
    configValues.FLUTTERWAVE_API_MODE = "v4";
    configValues.FLUTTERWAVE_CLIENT_ID = "flutterwave-client-id-placeholder";
    configValues.FLUTTERWAVE_CLIENT_SECRET = "flutterwave-client-secret-placeholder";
    configValues.FLUTTERWAVE_BASE_URL = "https://f4bexperience.flutterwave.com";
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "success",
          data: {
            reference: "KGO-FLUTTERWAVE-V4-REDIRECT",
            next_action: {
              redirect_url: {
                url: "https://checkout.flutterwave.com/v4/redirect/test-link"
              }
            }
          }
        })
      });

    const result = await provider.initialize(initializationInput("KGO-FLUTTERWAVE-V4-REDIRECT"));

    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v4/redirect/test-link");
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("linkAlias=data.next_action.redirect_url.url"));
  });

  it("accepts safe hosted checkout URL aliases without exposing provider payloads", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          checkoutUrl: "https://checkout.flutterwave.com/v3/hosted/pay/top-level-link"
        })
      });

    const result = await provider.initialize(initializationInput("KGO-FLUTTERWAVE-ALIAS"));

    expect(result.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/top-level-link");
  });

  it("rejects initialization responses without a secure checkout URL", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          data: { tx_ref: "KGO-FLUTTERWAVE-123", link: "http://checkout.flutterwave.com/not-secure" }
        })
      });

    await expect(provider.initialize(initializationInput()))
      .rejects.toThrow("Flutterwave checkout link was not returned");
  });

  it("returns safe missing-link diagnostics without logging secrets, tokens, hosted URLs or raw payload values", async () => {
    fetchMock
      .mockResolvedValueOnce({
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

    await expect(provider.initialize(initializationInput("KGO-FLUTTERWAVE-NO-LINK")))
      .rejects.toMatchObject({
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

    const logs = [...loggerSpy.mock.calls, ...loggerWarnSpy.mock.calls].flat().join("\n");
    expect(logs).toContain("apiMode=v3");
    expect(logs).toContain("linkFound=false");
    expect(logs).toContain("linkAlias=none");
    expect(logs).toContain("baseHost=api.flutterwave.com");
    expect(logs).not.toContain("flutterwave-secret-key-placeholder");
    expect(logs).not.toContain("sensitive-token-placeholder");
    expect(logs).not.toContain("Authorization");
    expect(logs).not.toContain("checkout.flutterwave.com/not-secure");
    expect(logs).not.toContain("Hosted Link");
  });

  it("verifies payment evidence by reference without marking success client-side", async () => {
    fetchMock
      .mockResolvedValueOnce({
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
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer flutterwave-secret-key-placeholder"
        })
      })
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
