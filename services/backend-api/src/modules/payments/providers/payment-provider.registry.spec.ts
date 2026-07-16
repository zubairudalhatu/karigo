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

  it("keeps Squad deferred from customer checkout by default", () => {
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

  it("still blocks non-mock checkout providers when live payments are enabled", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "PAYMENTS_LIVE_ENABLED") return true;
      return fallback;
    });

    expect(() => registry().customerTestProvider("monnify"))
      .toThrow("Live payment providers are disabled for customer checkout");
  });
});
