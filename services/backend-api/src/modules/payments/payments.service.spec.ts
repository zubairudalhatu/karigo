import { BadRequestException, ConflictException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentsService } from "./payments.service";
import { PaymentProviderInitializationException } from "./providers/payment-provider-diagnostics";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";

describe("PaymentsService", () => {
  const tx = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    order: { update: jest.fn() },
    paymentWebhookLog: { create: jest.fn() }
    ,
    promoCodeUsage: { findUnique: jest.fn(), create: jest.fn() },
    promoCode: { update: jest.fn() },
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

  it("reports payment provider readiness without exposing configured secret values", () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "paystack",
        PAYMENTS_LIVE_ENABLED: false,
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
    expect(readiness.providerEnabledFlags.SQUAD_CUSTOMER_CHECKOUT_ENABLED).toBe("false_or_unset");
    const squad = readiness.providers.find((provider) => provider.provider === "squad");
    expect(squad?.customerSelectableInStaging).toBe(false);
    expect(squad).toMatchObject({ launchStatus: "PRIMARY_LAUNCH_PROVIDER" });
    expect(serialized).not.toContain("configured-monnify-secret");
    expect(serialized).not.toContain("sandbox_sk_configured_squad_secret");
    expect(readiness.liveActivation.supportedByCurrentCode).toBe(true);
    expect(readiness.liveActivation.blockers).toContain("PAYMENTS_PROVIDER must be squad");
  });

  it("reports live Squad readiness only when all live activation gates are configured", () => {
    registry.customerCheckoutProviders.mockReturnValue(["squad"]);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "squad",
        PAYMENTS_LIVE_ENABLED: true,
        SQUAD_MODE: "live",
        SQUAD_SECRET_KEY: "live-squad-secret-placeholder",
        SQUAD_PUBLIC_KEY: "live-squad-public-placeholder",
        SQUAD_BASE_URL: "https://api-d.squadco.com",
        SQUAD_CALLBACK_URL: "https://api.karigo.com.ng/api/v1/payments/callback/squad",
        SQUAD_WEBHOOK_SECRET: "live-webhook-secret-placeholder",
        SQUAD_LIVE_ACTIVATION_APPROVED: "true"
      };
      return values[key] ?? fallback;
    });

    const readiness = service.providerReadiness();
    const squad = readiness.providers.find((provider) => provider.provider === "squad");
    const serialized = JSON.stringify(readiness);

    expect(readiness.activeProvider).toBe("squad");
    expect(readiness.paymentsLiveEnabled).toBe(true);
    expect(readiness.customerSelectableSandboxProviders).toEqual(["squad"]);
    expect(squad).toMatchObject({
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
    expect(serialized).not.toContain("live-squad-secret-placeholder");
    expect(serialized).not.toContain("live-webhook-secret-placeholder");
  });

  it("returns public-safe staging payment config", () => {
    const configResult = service.publicPaymentConfig();

    expect(configResult).toEqual({
      livePaymentsEnabled: false,
      activeProvider: "mock",
      customerSelectableProviders: ["mock", "monnify", "paystack"],
      launchProviderLabel: "Staging payment providers",
      mockPaymentVisible: true,
      squadReady: false,
      monnifyVisible: true,
      paystackVisible: true,
      cashPaymentEnabled: false,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Cash/POD remains a manually reconciled launch option and must not be marked electronically paid.",
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletPaymentNote: "Wallet top-up and wallet order payment require backend verification before balance or order status changes.",
      launchCities: ["Kano", "Abuja"]
    });
  });

  it("returns public-safe live Squad payment config without secrets", () => {
    registry.customerCheckoutProviders.mockReturnValue(["squad"]);
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, string | boolean> = {
        PAYMENTS_PROVIDER: "squad",
        PAYMENTS_LIVE_ENABLED: true,
        SQUAD_MODE: "live",
        SQUAD_SECRET_KEY: "live-squad-secret-placeholder",
        SQUAD_BASE_URL: "https://api-d.squadco.com",
        SQUAD_CALLBACK_URL: "https://api.karigo.com.ng/api/v1/payments/callback/squad",
        SQUAD_WEBHOOK_SECRET: "live-webhook-secret-placeholder",
        SQUAD_LIVE_ACTIVATION_APPROVED: "true"
      };
      return values[key] ?? fallback;
    });

    const configResult = service.publicPaymentConfig();
    const serialized = JSON.stringify(configResult);

    expect(configResult).toEqual({
      livePaymentsEnabled: true,
      activeProvider: "squad",
      customerSelectableProviders: ["squad"],
      launchProviderLabel: "Squad by GTBank",
      mockPaymentVisible: false,
      squadReady: true,
      monnifyVisible: false,
      paystackVisible: false,
      cashPaymentEnabled: false,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Cash/POD remains a manually reconciled launch option and must not be marked electronically paid.",
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletPaymentNote: "Wallet top-up and wallet order payment require backend verification before balance or order status changes.",
      launchCities: ["Kano", "Abuja"]
    });
    expect(serialized).not.toContain("live-squad-secret-placeholder");
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
