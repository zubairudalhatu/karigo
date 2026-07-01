import { BadRequestException, ConflictException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentsService } from "./payments.service";
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
    get: jest.fn(() => mockProvider)
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    registry as unknown as PaymentProviderRegistry,
    audit as never,
    notifications as never
  );

  beforeEach(() => jest.clearAllMocks());

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
