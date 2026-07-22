import { ConfigService } from "@nestjs/config";
import { PaymentProvider } from "./payment-provider.interface";
import { PaymentProviderRegistry } from "./payment-provider.registry";

function provider(name: PaymentProvider["name"]): PaymentProvider {
  return {
    name,
    initialize: jest.fn(),
    verify: jest.fn(),
    parseWebhook: jest.fn()
  };
}

describe("PaymentProviderRegistry", () => {
  const mock = provider("mock");
  const paystack = provider("paystack");
  const flutterwave = provider("flutterwave");
  const monnify = provider("monnify");
  const squad = provider("squad");
  const config = {
    get: jest.fn((_: string, fallback?: unknown) => fallback)
  };

  function registry() {
    return new PaymentProviderRegistry(
      config as unknown as ConfigService,
      mock as never,
      paystack as never,
      flutterwave as never,
      monnify as never,
      squad as never
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((_: string, fallback?: unknown) => fallback);
  });

  it("keeps Squad hidden from sandbox customer checkout by default", () => {
    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual(["mock", "monnify", "paystack"]);
    expect(() => paymentRegistry.customerTestProvider("squad"))
      .toThrow("Squad Sandbox is deferred for customer checkout");
  });

  it("allows Squad customer checkout only when explicitly enabled", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "SQUAD_CUSTOMER_CHECKOUT_ENABLED") return "true";
      if (key === "PAYMENTS_LIVE_ENABLED") return false;
      return fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual(["mock", "monnify", "paystack", "squad"]);
    expect(paymentRegistry.customerTestProvider("squad")).toBe(squad);
  });

  it("blocks all live checkout when Flutterwave live configuration is incomplete", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "PAYMENTS_LIVE_ENABLED") return true;
      if (key === "FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED") return "true";
      return fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual([]);
    expect(() => paymentRegistry.customerTestProvider("flutterwave"))
      .toThrow("PAYMENTS_PROVIDER must be flutterwave before live payment checkout is enabled");
    expect(() => paymentRegistry.customerTestProvider("monnify"))
      .toThrow("Only Flutterwave is allowed for live customer checkout");
  });

  it("keeps live Flutterwave hidden from customer checkout until explicitly enabled", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "flutterwave",
        PAYMENTS_LIVE_ENABLED: true,
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_API_MODE: "v3",
        FLUTTERWAVE_SECRET_KEY: "flutterwave-secret-key-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "live-webhook-secret-placeholder"
      };
      return values[key] ?? fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual([]);
    expect(() => paymentRegistry.customerTestProvider("flutterwave"))
      .toThrow("Flutterwave customer checkout is temporarily disabled");
    expect(paymentRegistry.active()).toBe(flutterwave);
  });

  it("allows only Flutterwave when live payment checkout is fully approved and customer enabled", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "flutterwave",
        PAYMENTS_LIVE_ENABLED: true,
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_API_MODE: "v3",
        FLUTTERWAVE_SECRET_KEY: "flutterwave-secret-key-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "live-webhook-secret-placeholder",
        FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "true"
      };
      return values[key] ?? fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual(["flutterwave"]);
    expect(paymentRegistry.customerTestProvider("flutterwave")).toBe(flutterwave);
    expect(paymentRegistry.active()).toBe(flutterwave);
    expect(() => paymentRegistry.customerTestProvider("mock"))
      .toThrow("Only Flutterwave is allowed for live customer checkout");
  });
});
