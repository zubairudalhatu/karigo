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

  it("blocks all live checkout when Squad live configuration is incomplete", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "PAYMENTS_LIVE_ENABLED") return true;
      return fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual([]);
    expect(() => paymentRegistry.customerTestProvider("squad"))
      .toThrow("PAYMENTS_PROVIDER must be squad before live payment checkout is enabled");
    expect(() => paymentRegistry.customerTestProvider("monnify"))
      .toThrow("Only Squad by GTBank is allowed for live customer checkout");
  });

  it("allows only Squad when live payment checkout is fully approved", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "squad",
        PAYMENTS_LIVE_ENABLED: true,
        SQUAD_MODE: "live",
        SQUAD_SECRET_KEY: "live-squad-key-placeholder",
        SQUAD_BASE_URL: "https://api-d.squadco.com",
        SQUAD_CALLBACK_URL: "https://api.karigo.com.ng/api/v1/payments/callback/squad",
        SQUAD_WEBHOOK_SECRET: "live-webhook-secret-placeholder",
        SQUAD_LIVE_ACTIVATION_APPROVED: "true"
      };
      return values[key] ?? fallback;
    });

    const paymentRegistry = registry();

    expect(paymentRegistry.customerCheckoutProviders()).toEqual(["squad"]);
    expect(paymentRegistry.customerTestProvider("squad")).toBe(squad);
    expect(paymentRegistry.active()).toBe(squad);
    expect(() => paymentRegistry.customerTestProvider("mock"))
      .toThrow("Only Squad by GTBank is allowed for live customer checkout");
  });
});
