import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ServiceCategory,
  WalletLedgerDirection,
  WalletLedgerEntryStatus,
  WalletLedgerEntryType,
  WalletStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentsService } from "./payments.service";
import { PaymentProviderInitializationException } from "./providers/payment-provider-diagnostics";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";

describe("PaymentsService", () => {
  const tx = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    order: { update: jest.fn() },
    paymentWebhookLog: { create: jest.fn() }
    ,
    promoCodeUsage: { findUnique: jest.fn(), create: jest.fn() },
    promoCode: { update: jest.fn() },
    customerWallet: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    customerWalletLedgerEntry: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    customerProfile: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn() },
    notification: { create: jest.fn() }
  };
  const prisma = {
    order: { findFirst: jest.fn() },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    customerWallet: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    customerWalletLedgerEntry: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    customerProfile: { findUnique: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const mockProvider = {
    name: "mock",
    initialize: jest.fn(),
    verify: jest.fn(),
    parseWebhook: jest.fn()
  };
  const registry = {
    active: jest.fn(() => mockProvider),
    customerTestProvider: jest.fn(() => mockProvider),
    customerCheckoutProviders: jest.fn(() => ["mock", "monnify", "paystack"]),
    get: jest.fn(() => mockProvider)
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const config = {
    get: jest.fn((_: string, fallback?: unknown) => fallback)
  };
  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    registry as unknown as PaymentProviderRegistry,
    audit as never,
    notifications as never,
    config as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    registry.active.mockReturnValue(mockProvider);
    registry.customerTestProvider.mockReturnValue(mockProvider);
    registry.customerCheckoutProviders.mockReturnValue(["mock", "monnify", "paystack"]);
    registry.get.mockReturnValue(mockProvider);
    config.get.mockImplementation((_: string, fallback?: unknown) => fallback);
    prisma.$transaction.mockImplementation((callback) => callback(tx));
  });

  it("initiates payment using the server-owned order total", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-001",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(6000),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: "customer@example.com", phoneNumber: "+2348012345678" } }
    });
    prisma.payment.create.mockResolvedValue({
      id: "payment-1",
      transactionReference: "KGO-MOCK-TEST",
      amount: new Prisma.Decimal(6000),
      currency: "NGN"
    });
    mockProvider.initialize.mockResolvedValue({ authorizationUrl: "mock://payment/reference" });

    const result = await service.initiate("user-1", { orderId: "order-1", amount: 6000 });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: new Prisma.Decimal(6000),
        paymentStatus: PaymentStatus.PENDING,
        gateway: "mock"
      })
    });
    expect(result.authorization.authorizationUrl).toBe("mock://payment/reference");
    expect(result.authorization.checkoutUrl).toBe("mock://payment/reference");
    expect(result.authorization.paymentUrl).toBe("mock://payment/reference");
    expect(result.authorization.url).toBe("mock://payment/reference");
    expect(result.authorization.provider).toBe("mock");
    expect(result.authorization.reference).toBe("KGO-MOCK-TEST");
    expect(result.authorization.amount).toBe(6000);
    expect(result.authorization.currency).toBe("NGN");
    expect(result.authorization).not.toHaveProperty("providerResponse");
  });

  it("normalizes provider checkout URL aliases into a canonical customer authorizationUrl", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-001",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(6000),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: "customer@example.com", phoneNumber: "+2348012345678" } }
    });
    prisma.payment.create.mockResolvedValue({
      id: "payment-1",
      transactionReference: "KGO-FLUTTERWAVE-ALIAS",
      amount: new Prisma.Decimal(6000),
      currency: "NGN"
    });
    mockProvider.initialize.mockResolvedValue({
      authorizationUrl: "   ",
      checkoutUrl: "https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-ALIAS",
      providerResponse: {}
    });

    const result = await service.initiate("user-1", { orderId: "order-1", amount: 6000 });

    expect(result.authorization.authorizationUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-ALIAS");
    expect(result.authorization.checkoutUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-ALIAS");
    expect(result.authorization.paymentUrl).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-ALIAS");
    expect(result.authorization.url).toBe("https://checkout.flutterwave.com/v3/hosted/pay/KGO-FLUTTERWAVE-ALIAS");
    expect(result.authorization).toEqual(expect.objectContaining({
      provider: "mock",
      reference: "KGO-FLUTTERWAVE-ALIAS",
      amount: 6000,
      currency: "NGN"
    }));
  });

  it("blocks customer electronic checkout when no customer provider is enabled", async () => {
    const squadProvider = {
      name: "squad",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-001",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(6000),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: "customer@example.com", phoneNumber: "+2348012345678" } }
    });
    registry.active.mockReturnValue(squadProvider);
    registry.customerCheckoutProviders.mockReturnValue([]);

    await expect(service.initiate("user-1", { orderId: "order-1", amount: 6000 }))
      .rejects.toThrow("Customer electronic checkout is temporarily unavailable");
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(squadProvider.initialize).not.toHaveBeenCalled();
  });

  it("initiates payment with a customer-selected sandbox provider", async () => {
    const monnifyProvider = {
      name: "monnify",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    prisma.order.findFirst.mockResolvedValue({
      id: "order-monnify",
      orderNumber: "KGO-002",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(7500),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: "customer@example.com", phoneNumber: "+2348012345678" } }
    });
    prisma.payment.create.mockResolvedValue({
      id: "payment-monnify",
      transactionReference: "KGO-MONNIFY-TEST",
      amount: new Prisma.Decimal(7500),
      currency: "NGN"
    });
    registry.customerTestProvider.mockReturnValue(monnifyProvider);
    monnifyProvider.initialize.mockResolvedValue({
      authorizationUrl: "https://sandbox.monnify.com/checkout",
      providerResponse: {}
    });

    await service.initiate("user-1", {
      orderId: "order-monnify",
      amount: 7500,
      paymentMethod: "card",
      paymentProvider: "monnify"
    });

    expect(registry.customerTestProvider).toHaveBeenCalledWith("monnify");
    expect(registry.active).not.toHaveBeenCalled();
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gateway: "monnify",
        paymentMethod: "card"
      })
    });
    expect(monnifyProvider.initialize).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        selectedPaymentProvider: "monnify"
      })
    }));
  });

  it("logs provider initialization reasons while returning a safe customer error", async () => {
    const paystackProvider = {
      name: "paystack",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    prisma.order.findFirst.mockResolvedValue({
      id: "order-paystack",
      orderNumber: "KGO-003",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(8500),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: null, phoneNumber: "+2348012345678" } }
    });
    prisma.payment.create.mockResolvedValue({
      id: "payment-paystack",
      currency: "NGN"
    });
    registry.customerTestProvider.mockReturnValue(paystackProvider);
    paystackProvider.initialize.mockRejectedValue(new BadRequestException("missing PAYSTACK_SECRET_KEY"));
    notifications.createNotification.mockRejectedValueOnce(new Error("notification write failed"));

    await expect(service.initiate("user-1", {
      orderId: "order-paystack",
      amount: 8500,
      paymentProvider: "paystack"
    })).rejects.toThrow("Paystack Test Mode could not be started. Please use mock payment or retry the sandbox provider later.");

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-paystack" },
      data: { paymentStatus: PaymentStatus.FAILED }
    });
  });

  it("reports live Flutterwave readiness low-value testing as a non-blocking operations check", () => {
    registry.customerCheckoutProviders.mockReturnValue(["flutterwave"]);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "flutterwave",
        PAYMENTS_LIVE_ENABLED: true,
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_SECRET_KEY: "live-flutterwave-secret-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "live-webhook-secret-placeholder",
        FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "true"
      };
      return values[key] ?? fallback;
    });

    const readiness = service.providerReadiness();
    const flutterwave = readiness.providers.find((provider) => provider.provider === "flutterwave");

    expect(flutterwave?.status).toBe("READY");
    expect(flutterwave?.issues).not.toContain(expect.stringContaining("Low-value live test"));
    expect(readiness.liveActivation.status).toBe("READY");
  });

  it("returns a clear safe error when Flutterwave does not return a hosted checkout link", async () => {
    const flutterwaveProvider = {
      name: "flutterwave",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    prisma.order.findFirst.mockResolvedValue({
      id: "order-flutterwave",
      orderNumber: "KGO-004",
      customerId: "customer-1",
      totalAmount: new Prisma.Decimal(8500),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: { email: "customer@example.com", phoneNumber: "+2348012345678" } }
    });
    prisma.payment.create.mockResolvedValue({
      id: "payment-flutterwave",
      transactionReference: "KGO-FLUTTERWAVE-NO-LINK",
      amount: new Prisma.Decimal(8500),
      currency: "NGN"
    });
    registry.customerTestProvider.mockReturnValue(flutterwaveProvider);
    registry.customerCheckoutProviders.mockReturnValue(["flutterwave"]);
    flutterwaveProvider.initialize.mockRejectedValue(new PaymentProviderInitializationException({
      provider: "flutterwave",
      stage: "initialize-transaction",
      message: "Flutterwave checkout link was not returned.",
      providerMessage: "Flutterwave checkout link was not returned.",
      code: "FLUTTERWAVE_CHECKOUT_LINK_MISSING",
      httpStatusCode: 200,
      safeDiagnostics: {
        responseKeys: ["data", "message", "status"],
        dataKeys: [],
        statusCode: 200
      }
    }));

    await expect(service.initiate("user-1", {
      orderId: "order-flutterwave",
      amount: 8500,
      paymentProvider: "flutterwave"
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        error_code: "FLUTTERWAVE_CHECKOUT_LINK_MISSING",
        message: "Flutterwave checkout link was not returned."
      })
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-flutterwave" },
      data: { paymentStatus: PaymentStatus.FAILED }
    });
  });

  it("reports payment provider readiness without exposing configured secret values", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "paystack",
        PAYMENTS_LIVE_ENABLED: false,
        FLUTTERWAVE_ENVIRONMENT: "live",
        PAYSTACK_MODE: "test",
        MONNIFY_MODE: "sandbox",
        MONNIFY_API_KEY: "configured-monnify-api-key",
        MONNIFY_SECRET_KEY: "configured-monnify-secret",
        SQUAD_MODE: "sandbox",
        SQUAD_SECRET_KEY: "sandbox_sk_configured_squad_secret"
      };
      return values[key] ?? fallback;
    });

    const readiness = service.providerReadiness();
    const paystack = readiness.providers.find((provider) => provider.provider === "paystack");
    const monnify = readiness.providers.find((provider) => provider.provider === "monnify");
    const serialized = JSON.stringify(readiness);

    expect(readiness.activeProvider).toBe("paystack");
    expect(readiness.paymentsLiveEnabled).toBe(false);
    expect(paystack?.issues).toContain("missing PAYSTACK_SECRET_KEY");
    expect(monnify?.issues).toContain("missing MONNIFY_CONTRACT_CODE");
    expect(readiness.customerSelectableSandboxProviders).toEqual(["mock", "monnify", "paystack"]);
    expect(readiness.providerEnabledFlags.FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED).toBe("false_or_unset");
    expect(readiness.providerEnabledFlags.SQUAD_CUSTOMER_CHECKOUT_ENABLED).toBe("false_or_unset");
    expect(readiness.providerEnabledFlags.CASH_ON_DELIVERY_ENABLED).toBe("false_or_unset");
    expect(readiness.launchPaymentOptions.cashOnDelivery).toMatchObject({
      enabled: false,
      launchCities: ["Kano", "Abuja"],
      customerSelectable: false,
      requiresReconciliation: true,
      adminReconciliationAvailable: true,
      captainCashCollectionConfirmationAvailable: true,
      vendorVisibilityAvailable: true
    });
    expect(readiness.launchPaymentOptions.squadCustomerCheckout).toMatchObject({
      enabled: false,
      customerSelectable: false,
      envFlag: "SQUAD_CUSTOMER_CHECKOUT_ENABLED",
      recommendedValue: "false"
    });
    expect(readiness.launchPaymentOptions.flutterwaveCustomerCheckout).toMatchObject({
      enabled: false,
      customerSelectable: false,
      envFlag: "FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED",
      recommendedValue: "true"
    });
    expect(readiness.launchPaymentOptions.wallet).toMatchObject({
      walletTopUpEnabled: false,
      walletTopUpConfiguredByEnv: false,
      walletPaymentsEnabled: false,
      providerForTopUp: "Flutterwave",
      backendVerificationRequired: true,
      clientSideCreditDisabled: true,
      adminWalletVisibilityAvailable: true,
      minimumTopUpAmount: 100
    });
    const squad = readiness.providers.find((provider) => provider.provider === "squad");
    expect(squad?.customerSelectableInStaging).toBe(false);
    expect(squad).toMatchObject({ launchStatus: "DEFERRED_FOR_LAUNCH" });
    expect(serialized).not.toContain("configured-monnify-secret");
    expect(serialized).not.toContain("sandbox_sk_configured_squad_secret");
    expect(readiness.liveActivation.supportedByCurrentCode).toBe(true);
    expect(readiness.liveActivation.blockers).toContain("PAYMENTS_PROVIDER must be flutterwave");
  });

  it("reports live Flutterwave readiness only when all live activation gates are configured", () => {
    registry.customerCheckoutProviders.mockReturnValue(["flutterwave"]);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "flutterwave",
        PAYMENTS_LIVE_ENABLED: true,
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_SECRET_KEY: "live-flutterwave-secret-placeholder",
        FLUTTERWAVE_PUBLIC_KEY: "live-flutterwave-public-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "live-webhook-secret-placeholder",
        FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "true"
      };
      return values[key] ?? fallback;
    });

    const readiness = service.providerReadiness();
    const flutterwave = readiness.providers.find((provider) => provider.provider === "flutterwave");
    const serialized = JSON.stringify(readiness);

    expect(readiness.activeProvider).toBe("flutterwave");
    expect(readiness.paymentsLiveEnabled).toBe(true);
    expect(readiness.customerSelectableSandboxProviders).toEqual(["flutterwave"]);
    expect(flutterwave).toMatchObject({
      launchStatus: "PRIMARY_LAUNCH_PROVIDER",
      readyForLiveCheckout: true,
      readyForSandboxCheckout: false,
      status: "READY"
    });
    expect(readiness.liveActivation).toEqual({
      supportedByCurrentCode: true,
      status: "READY",
      blockers: []
    });
    expect(serialized).not.toContain("live-flutterwave-secret-placeholder");
    expect(serialized).not.toContain("live-webhook-secret-placeholder");
  });

  it("reports launch Cash/POD and wallet top-up readiness while wallet order payments remain disabled", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        CASH_ON_DELIVERY_ENABLED: "true",
        WALLET_TOP_UP_ENABLED: "true",
        WALLET_PAYMENTS_ENABLED: "false",
        SQUAD_CUSTOMER_CHECKOUT_ENABLED: "false"
      };
      return values[key] ?? fallback;
    });

    const readiness = service.providerReadiness();
    const configResult = service.publicPaymentConfig();

    expect(readiness.providerEnabledFlags.CASH_ON_DELIVERY_ENABLED).toBe("true");
    expect(readiness.providerEnabledFlags.WALLET_TOP_UP_ENABLED).toBe("true");
    expect(readiness.providerEnabledFlags.WALLET_PAYMENTS_ENABLED).toBe("false_or_unset");
    expect(readiness.launchPaymentOptions.cashOnDelivery.customerSelectable).toBe(true);
    expect(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.enabled).toBe(false);
    expect(readiness.launchPaymentOptions.squadCustomerCheckout.enabled).toBe(false);
    expect(readiness.launchPaymentOptions.wallet.walletTopUpConfiguredByEnv).toBe(true);
    expect(readiness.launchPaymentOptions.wallet.walletTopUpEnabled).toBe(false);
    expect(readiness.launchPaymentOptions.wallet.walletPaymentsEnabled).toBe(false);
    expect(configResult).toEqual(expect.objectContaining({
      cashPaymentEnabled: true,
      flutterwaveCustomerCheckoutEnabled: false,
      squadCustomerCheckoutEnabled: false,
      walletTopUpEnabled: false,
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: 100,
      walletPaymentsEnabled: false,
      launchCities: ["Kano", "Abuja"]
    }));
  });

  it("returns public-safe staging payment config", () => {
    const configResult = service.publicPaymentConfig();

    expect(configResult).toEqual({
      livePaymentsEnabled: false,
      activeProvider: "mock",
      customerSelectableProviders: ["mock", "monnify", "paystack"],
      launchProviderLabel: "Staging payment providers",
      mockPaymentVisible: true,
      flutterwaveCustomerCheckoutEnabled: false,
      flutterwaveReady: false,
      squadCustomerCheckoutEnabled: false,
      squadReady: false,
      monnifyVisible: true,
      paystackVisible: true,
      cashPaymentEnabled: false,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Pay on Delivery is available for supported KariGO orders.",
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: 100,
      walletPaymentNote: "Wallet top-up is temporarily unavailable while KariGO verifies the new payment provider.",
      launchCities: ["Kano", "Abuja"]
    });
  });

  it("returns public-safe live Flutterwave payment config without secrets", () => {
    registry.customerCheckoutProviders.mockReturnValue(["flutterwave"]);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "flutterwave",
        PAYMENTS_LIVE_ENABLED: true,
        FLUTTERWAVE_ENVIRONMENT: "live",
        FLUTTERWAVE_SECRET_KEY: "live-flutterwave-secret-placeholder",
        FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
        FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
        FLUTTERWAVE_SECRET_HASH: "live-webhook-secret-placeholder",
        FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "true"
      };
      return values[key] ?? fallback;
    });

    const configResult = service.publicPaymentConfig();
    const serialized = JSON.stringify(configResult);

    expect(configResult).toEqual({
      livePaymentsEnabled: true,
      activeProvider: "flutterwave",
      customerSelectableProviders: ["flutterwave"],
      launchProviderLabel: "Flutterwave",
      mockPaymentVisible: false,
      flutterwaveCustomerCheckoutEnabled: true,
      flutterwaveReady: true,
      squadCustomerCheckoutEnabled: false,
      squadReady: false,
      monnifyVisible: false,
      paystackVisible: false,
      cashPaymentEnabled: false,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Pay on Delivery is available for supported KariGO orders.",
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: 100,
      walletPaymentNote: "Wallet top-up is temporarily unavailable while KariGO verifies the new payment provider.",
      launchCities: ["Kano", "Abuja"]
    });
    expect(serialized).not.toContain("live-flutterwave-secret-placeholder");
    expect(serialized).not.toContain("live-webhook-secret-placeholder");
  });

  it("runs a safe admin sandbox initialization test without storing a payment", async () => {
    const monnifyProvider = {
      name: "monnify",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    registry.get.mockReturnValue(monnifyProvider);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "MONNIFY_MODE") return "sandbox";
      return fallback;
    });
    monnifyProvider.initialize.mockResolvedValue({
      transactionReference: "KGO-MONNIFY-TEST-123",
      authorizationUrl: "https://sandbox.monnify.com/checkout",
      accessCode: "MNFY-123",
      providerResponse: { requestSuccessful: true }
    });

    const result = await service.testProviderInitialization("monnify");

    expect(result).toEqual(expect.objectContaining({
      success: true,
      provider: "monnify",
      mode: "sandbox",
      authorizationUrlPresent: true,
      accessCodePresent: true
    }));
    expect(registry.get).toHaveBeenCalledWith("monnify");
    expect(registry.customerTestProvider).not.toHaveBeenCalled();
    expect(monnifyProvider.initialize).toHaveBeenCalledWith(expect.objectContaining({
      amount: "100.00",
      currency: "NGN",
      customerEmail: expect.stringContaining("@sandbox.karigo.com.ng"),
      metadata: expect.objectContaining({
        purpose: "admin-provider-readiness-test"
      })
    }));
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("returns safe stage diagnostics when an admin sandbox initialization test fails", async () => {
    const paystackProvider = {
      name: "paystack",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    registry.get.mockReturnValue(paystackProvider);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "PAYSTACK_MODE") return "test";
      return fallback;
    });
    paystackProvider.initialize.mockRejectedValue(new PaymentProviderInitializationException({
      provider: "paystack",
      stage: "initialize-transaction",
      message: "Paystack request failed",
      httpStatusCode: 400,
      providerMessage: "Invalid callback URL"
    }));

    const result = await service.testProviderInitialization("paystack");
    const serialized = JSON.stringify(result);

    expect(result).toEqual(expect.objectContaining({
      success: false,
      provider: "paystack",
      mode: "test",
      stage: "initialize-transaction",
      httpStatusCode: 400,
      providerMessage: "Invalid callback URL"
    }));
    expect(serialized).not.toContain("SECRET_KEY");
    expect(serialized).not.toContain("sk_");
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("blocks wallet top-up when the launch flag is disabled", async () => {
    await expect(service.initiateWalletTopUp("user-1", { amount: 5000 }))
      .rejects.toThrow("Wallet top-up is temporarily unavailable");
  });

  it("keeps wallet top-up blocked even if launch flags are accidentally enabled", async () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "WALLET_TOP_UP_ENABLED") return "true";
      if (key === "FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED") return "true";
      return fallback;
    });

    await expect(service.initiateWalletTopUp("user-1", { amount: 5000 }))
      .rejects.toThrow("Wallet top-up is temporarily unavailable");

    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(registry.active).not.toHaveBeenCalled();
  });

  it("credits wallet only after backend verification and avoids duplicate crediting", async () => {
    const squadProvider = {
      name: "squad",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    registry.get.mockReturnValue(squadProvider);
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-wallet-topup",
      customerId: "customer-1",
      gateway: "squad",
      amount: new Prisma.Decimal(5000),
      currency: "NGN",
      transactionReference: "KGO-WALLET-TOPUP",
      paymentPurpose: PaymentPurpose.WALLET_TOP_UP,
      walletLedgerEntryId: "ledger-1",
      paymentStatus: PaymentStatus.PENDING,
      order: null
    });
    squadProvider.verify.mockResolvedValue({
      transactionReference: "KGO-WALLET-TOPUP",
      successful: true,
      amountMinor: 500000,
      currency: "NGN",
      providerResponse: { status: "success" }
    });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-wallet-topup",
      customerId: "customer-1",
      gateway: "squad",
      amount: new Prisma.Decimal(5000),
      currency: "NGN",
      transactionReference: "KGO-WALLET-TOPUP",
      paymentPurpose: PaymentPurpose.WALLET_TOP_UP,
      walletLedgerEntryId: "ledger-1",
      paymentStatus: PaymentStatus.PENDING,
      order: null
    });
    tx.customerWalletLedgerEntry.findUnique.mockResolvedValue({
      id: "ledger-1",
      walletId: "wallet-1",
      status: WalletLedgerEntryStatus.PENDING
    });
    tx.customerWallet.findUnique.mockResolvedValue({
      id: "wallet-1",
      status: WalletStatus.ACTIVE,
      availableBalance: new Prisma.Decimal(1000)
    });
    tx.payment.update.mockResolvedValue({ id: "payment-wallet-topup", paymentStatus: PaymentStatus.SUCCESSFUL });
    tx.customerProfile.findUnique.mockResolvedValue({ userId: "user-1" });

    await service.verifyWalletTopUp("user-1", "KGO-WALLET-TOPUP");

    expect(tx.customerWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: expect.objectContaining({
        availableBalance: new Prisma.Decimal(6000),
        ledgerBalance: new Prisma.Decimal(6000)
      })
    });
    expect(tx.customerWalletLedgerEntry.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: expect.objectContaining({
        status: WalletLedgerEntryStatus.POSTED,
        sourceId: "payment-wallet-topup"
      })
    });

    jest.clearAllMocks();
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-wallet-topup",
      paymentStatus: PaymentStatus.SUCCESSFUL,
      paymentPurpose: PaymentPurpose.WALLET_TOP_UP
    });
    const duplicate = await service.verifyWalletTopUp("user-1", "KGO-WALLET-TOPUP");
    expect(duplicate.alreadyProcessed).toBe(true);
    expect(tx.customerWallet.update).not.toHaveBeenCalled();
  });

  it("rejects order payment references on the wallet top-up verification route", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-order",
      paymentStatus: PaymentStatus.PENDING,
      paymentPurpose: PaymentPurpose.ORDER_PAYMENT
    });

    await expect(service.verifyWalletTopUp("user-1", "KGO-ORDER-PAYMENT"))
      .rejects.toThrow("Payment reference is not a wallet top-up");
    expect(registry.get).not.toHaveBeenCalled();
  });

  it("does not run admin sandbox initialization tests while live payments are configured", async () => {
    const squadProvider = {
      name: "squad",
      initialize: jest.fn(),
      verify: jest.fn(),
      parseWebhook: jest.fn()
    };
    registry.get.mockReturnValue(squadProvider);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === "PAYMENTS_LIVE_ENABLED") return true;
      if (key === "SQUAD_MODE") return "live";
      return fallback;
    });

    const result = await service.testProviderInitialization("squad");

    expect(result).toEqual(expect.objectContaining({
      success: false,
      provider: "squad",
      mode: "live",
      stage: "config-read",
      providerMessage: "Sandbox initialization tests are disabled while live payment mode is configured."
    }));
    expect(squadProvider.initialize).not.toHaveBeenCalled();
  });

  it("rejects a frontend amount that does not match the order total", async () => {
    prisma.order.findFirst.mockResolvedValue({
      totalAmount: new Prisma.Decimal(6000),
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      customer: { user: {} }
    });

    await expect(service.initiate("user-1", { orderId: "order-1", amount: 5000 }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("moves an awaiting-payment order to paid exactly once", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: { id: "order-1" }
    });
    mockProvider.verify.mockResolvedValue({
      transactionReference: "KGO-MOCK-123",
      successful: true,
      providerResponse: { status: "successful" }
    });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: { orderStatus: OrderStatus.AWAITING_PAYMENT }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-1", paymentStatus: PaymentStatus.SUCCESSFUL });

    await service.verify("user-1", "KGO-MOCK-123");

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        paymentStatus: PaymentStatus.SUCCESSFUL,
        orderStatus: OrderStatus.PAID,
        statusHistory: expect.any(Object)
      })
    });
  });

  it("rejects successful provider verification when the amount evidence does not match", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      gateway: "paystack",
      amount: new Prisma.Decimal(6000),
      currency: "NGN",
      paymentStatus: PaymentStatus.PENDING,
      order: { id: "order-1" }
    });
    mockProvider.verify.mockResolvedValue({
      transactionReference: "KGO-PAYSTACK-123",
      successful: true,
      amountMinor: 500000,
      currency: "NGN",
      providerResponse: { status: "success" }
    });

    await expect(service.verify("user-1", "KGO-PAYSTACK-123"))
      .rejects.toThrow("Provider payment amount does not match the order total");
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it("records promo usage only when payment succeeds", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: { id: "order-1" }
    });
    mockProvider.verify.mockResolvedValue({ transactionReference: "KGO-MOCK-PROMO", successful: true, providerResponse: { status: "successful" } });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      customerId: "customer-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: {
        orderStatus: OrderStatus.AWAITING_PAYMENT,
        promoCodeId: "promo-1",
        discountAmount: new Prisma.Decimal(500)
      }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-1", paymentStatus: PaymentStatus.SUCCESSFUL });
    tx.promoCodeUsage.findUnique.mockResolvedValue(null);

    await service.verify("user-1", "KGO-MOCK-PROMO");

    expect(tx.promoCodeUsage.create).toHaveBeenCalledWith({
      data: {
        promoCodeId: "promo-1",
        customerId: "customer-1",
        orderId: "order-1",
        discountAmount: new Prisma.Decimal(500)
      }
    });
    expect(tx.promoCode.update).toHaveBeenCalledWith({
      where: { id: "promo-1" },
      data: { usageCount: { increment: 1 } }
    });
  });

  it("moves a paid parcel directly to ready for pickup with complete history", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-parcel",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: { id: "parcel-order" }
    });
    mockProvider.verify.mockResolvedValue({ transactionReference: "KGO-MOCK-PARCEL", successful: true, providerResponse: { status: "successful" } });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-parcel",
      orderId: "parcel-order",
      customerId: "customer-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: {
        orderStatus: OrderStatus.AWAITING_PAYMENT,
        serviceCategory: ServiceCategory.PARCEL,
        promoCodeId: null,
        discountAmount: new Prisma.Decimal(0)
      }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-parcel", paymentStatus: PaymentStatus.SUCCESSFUL });

    await service.verify("user-1", "KGO-MOCK-PARCEL");

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "parcel-order" },
      data: expect.objectContaining({
        orderStatus: OrderStatus.READY_FOR_PICKUP,
        statusHistory: {
          create: [
            expect.objectContaining({ newStatus: OrderStatus.PAID }),
            expect.objectContaining({ newStatus: OrderStatus.READY_FOR_PICKUP })
          ]
        }
      })
    });
  });

  it("returns an already processed successful verification without updating again", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      paymentStatus: PaymentStatus.SUCCESSFUL
    });

    const result = await service.verify("user-1", "KGO-MOCK-123");

    expect(result.alreadyProcessed).toBe(true);
    expect(mockProvider.verify).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("moves successful customer payments into refund pending", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      paymentStatus: PaymentStatus.SUCCESSFUL,
      order: { orderStatus: OrderStatus.PAID }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-1", paymentStatus: PaymentStatus.REFUND_PENDING });

    await service.requestRefund("user-1", "payment-1");

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        paymentStatus: PaymentStatus.REFUND_PENDING,
        orderStatus: OrderStatus.REFUND_REQUESTED
      })
    });
  });

  it("approves a pending refund and records the admin transition", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      paymentStatus: PaymentStatus.REFUND_PENDING,
      order: { orderStatus: OrderStatus.REFUND_REQUESTED }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-1", paymentStatus: PaymentStatus.REFUNDED });

    await service.approveRefund("admin-1", "payment-1");

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        paymentStatus: PaymentStatus.REFUNDED,
        orderStatus: OrderStatus.REFUNDED,
        statusHistory: expect.any(Object)
      })
    });
  });

  it("stores and processes a verified mock webhook", async () => {
    mockProvider.parseWebhook.mockResolvedValue({
      eventType: "payment.success",
      transactionReference: "KGO-MOCK-123",
      successful: true,
      verified: true,
      providerResponse: { status: "successful" }
    });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      gateway: "mock",
      paymentStatus: PaymentStatus.PENDING,
      order: { orderStatus: OrderStatus.AWAITING_PAYMENT }
    });
    tx.payment.update.mockResolvedValue({ id: "payment-1", paymentStatus: PaymentStatus.SUCCESSFUL });

    const result = await service.webhook("mock", { transactionReference: "KGO-MOCK-123" });

    expect(tx.paymentWebhookLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gateway: "mock",
        transactionReference: "KGO-MOCK-123",
        isVerified: true
      })
    });
    expect(result.processed).toBe(true);
  });

  it("treats a duplicate webhook as already handled", async () => {
    mockProvider.parseWebhook.mockResolvedValue({
      eventType: "payment.success",
      transactionReference: "KGO-MOCK-123",
      successful: true,
      verified: true,
      providerResponse: { status: "successful" }
    });
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate webhook", {
        code: "P2002",
        clientVersion: "6.19.3"
      })
    );

    await expect(service.webhook("mock", { transactionReference: "KGO-MOCK-123" }))
      .resolves.toEqual({ processed: false, duplicate: true });
  });

  it("rejects refund requests for pending payments", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      paymentStatus: PaymentStatus.PENDING,
      order: {}
    });
    await expect(service.requestRefund("user-1", "payment-1"))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects initiation for an already-paid order", async () => {
    prisma.order.findFirst.mockResolvedValue({
      paymentStatus: PaymentStatus.SUCCESSFUL
    });
    await expect(service.initiate("user-1", { orderId: "order-1", amount: 6000 }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
