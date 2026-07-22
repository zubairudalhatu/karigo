import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AccelerateUtilityProvider } from "./providers/accelerate-utility.provider";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
import { UtilityProviderClient } from "./providers/utility-provider.interface";
import { UtilitiesService } from "./utilities.service";

const provider = {
  id: "provider-id",
  type: UtilityServiceType.AIRTIME,
  name: "MTN",
  code: "DEMO_MTN_AIRTIME_PROVIDER",
  isActive: true,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const product = {
  id: "product-id",
  providerId: provider.id,
  type: UtilityServiceType.AIRTIME,
  name: "MTN Airtime Variable Amount",
  code: "DEMO_MTN_AIRTIME",
  amountKobo: null,
  minAmountKobo: 10000,
  maxAmountKobo: 10000000,
  isActive: true,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

function serviceWith(options: {
  prismaOverrides?: Record<string, unknown>;
  configValues?: Record<string, unknown>;
  accelerateProvider?: Partial<UtilityProviderClient> & { isConfigured?: jest.Mock };
} = {}) {
  const prisma = {
    customerProfile: { findUnique: jest.fn().mockResolvedValue({ id: "customer-id" }) },
    utilityProvider: {
      findMany: jest.fn().mockResolvedValue([provider]),
      findFirst: jest.fn().mockResolvedValue(provider)
    },
    utilityProduct: {
      findMany: jest.fn().mockResolvedValue([product]),
      findFirst: jest.fn().mockResolvedValue(product)
    },
    utilityTransaction: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: "transaction-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: data.completedAt ?? null,
        provider,
        product
      })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: "transaction-id",
        reference: "KGO-UTIL-REFERENCE",
        customerId: "customer-id",
        serviceType: provider.type,
        providerId: provider.id,
        productId: product.id,
        amountKobo: 50000,
        convenienceFeeKobo: 0,
        totalKobo: 50000,
        recipient: "+2348030000000",
        recipientName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: data.completedAt ?? null,
        provider,
        product
      }))
    },
    ...options.prismaOverrides
  } as unknown as PrismaService;
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => options.configValues?.[key] ?? fallback)
  } as unknown as ConfigService;
  const audit = { record: jest.fn() } as unknown as AdminAuditService;
  const accelerateProvider = {
    isConfigured: jest.fn().mockReturnValue(false),
    validateRecipient: jest.fn(),
    quote: jest.fn(),
    purchase: jest.fn(),
    checkStatus: jest.fn(),
    ...options.accelerateProvider
  } as unknown as AccelerateUtilityProvider;
  return { prisma, accelerateProvider, audit, service: new UtilitiesService(prisma, config, new MockUtilityProvider(), accelerateProvider, audit) };
}

describe("UtilitiesService", () => {
  it("lists only active catalogue providers through the public catalogue path", async () => {
    const { prisma, service } = serviceWith();
    await expect(service.listProviders({ type: UtilityServiceType.AIRTIME })).resolves.toEqual([provider]);
    expect(prisma.utilityProvider.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, type: UtilityServiceType.AIRTIME }
    }));
  });

  it("quotes with server-side provider validation and masked recipient", async () => {
    const { service } = serviceWith();
    await expect(service.quote("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000"
    })).resolves.toMatchObject({
      serviceType: UtilityServiceType.AIRTIME,
      amountKobo: 50000,
      totalKobo: 50000,
      recipient: "+234803***0000",
      testMode: true
    });
  });

  it("creates a successful mock transaction with a unique reference", async () => {
    const { prisma, service } = serviceWith();
    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000"
    });
    expect(result).toMatchObject({ status: UtilityTransactionStatus.SUCCESSFUL, testMode: true });
    expect(prisma.utilityTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: "customer-id",
        providerId: provider.id,
        recipient: "+2348030000000",
        amountKobo: 50000,
        status: UtilityTransactionStatus.PENDING,
        providerStatus: "MOCK_PENDING"
      })
    }));
    expect(prisma.utilityTransaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: UtilityTransactionStatus.SUCCESSFUL,
        providerStatus: "MOCK_SUCCESSFUL"
      })
    }));
  });

  it("rejects inactive or missing providers", async () => {
    const { service } = serviceWith({
      prismaOverrides: {
      utilityProvider: { findFirst: jest.fn().mockResolvedValue(null) }
      }
    });
    await expect(service.quote("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000"
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects invalid amounts before purchase", async () => {
    const { service } = serviceWith();
    await expect(service.quote("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 10,
      recipient: "08030000000"
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("submits provider-backed transactions through Accelerate when explicitly enabled", async () => {
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn().mockResolvedValue({
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "PROCESSING",
        providerReference: "ACC-123",
        customerNote: "Your request is being processed.",
        metadata: { mode: "accelerate", testMode: true, responseKeys: ["status"] }
      })
    };
    const { prisma, service } = serviceWith({
      configValues: {
        UTILITIES_PROVIDER: "accelerate",
        UTILITIES_ENABLED: true,
        UTILITIES_CUSTOMER_PURCHASE_ENABLED: true,
        ACCELERATE_ENABLED: true,
        UTILITIES_TEST_MODE: true
      },
      accelerateProvider
    });

    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000"
    });

    expect(accelerateProvider.purchase).toHaveBeenCalledWith(expect.objectContaining({
      reference: expect.stringContaining("KGO-UTIL"),
      recipient: "+2348030000000"
    }));
    expect(prisma.utilityTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: UtilityTransactionStatus.PENDING,
        providerStatus: "ACCELERATE_PENDING",
        metadata: { mode: "accelerate", testMode: true }
      })
    }));
    expect(result).toMatchObject({
      status: UtilityTransactionStatus.PROCESSING,
      providerStatus: "PROCESSING",
      providerMode: "accelerate",
      testMode: true
    });
  });

  it("lets admin verify a non-terminal provider-backed transaction status idempotently", async () => {
    const processingTransaction = {
      id: "transaction-id",
      reference: "KGO-UTIL-REFERENCE",
      customerId: "customer-id",
      serviceType: provider.type,
      providerId: provider.id,
      productId: product.id,
      amountKobo: 50000,
      convenienceFeeKobo: 0,
      totalKobo: 50000,
      recipient: "+2348030000000",
      recipientName: null,
      status: UtilityTransactionStatus.PROCESSING,
      providerStatus: "PROCESSING",
      providerReference: "ACC-123",
      mockToken: null,
      customerNote: null,
      failureReason: null,
      metadata: { mode: "accelerate", testMode: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      provider,
      product,
      customer: { id: "customer-id", user: { id: "user-id", fullName: "Test Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } }
    };
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      checkStatus: jest.fn().mockResolvedValue({
        status: UtilityTransactionStatus.SUCCESSFUL,
        providerStatus: "SUCCESSFUL",
        providerReference: "ACC-123",
        customerNote: "Provider confirmed fulfillment.",
        metadata: { mode: "accelerate", testMode: true, responseKeys: ["status"] }
      })
    };
    const { prisma, audit, service } = serviceWith({
      prismaOverrides: {
        utilityTransaction: {
          findUnique: jest.fn().mockResolvedValue(processingTransaction),
          update: jest.fn().mockResolvedValue({
            ...processingTransaction,
            status: UtilityTransactionStatus.SUCCESSFUL,
            providerStatus: "SUCCESSFUL",
            customerNote: "Provider confirmed fulfillment.",
            completedAt: new Date()
          })
        }
      },
      accelerateProvider
    });

    const result = await service.adminVerifyProviderStatus("admin-id", "transaction-id");

    expect(accelerateProvider.checkStatus).toHaveBeenCalledWith("ACC-123");
    expect(prisma.utilityTransaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: UtilityTransactionStatus.SUCCESSFUL })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-id", "admin.utilities.provider_verify", "UtilityTransaction", "transaction-id", expect.any(Object));
    expect(result).toMatchObject({ status: UtilityTransactionStatus.SUCCESSFUL, providerMode: "accelerate" });
  });

  it("keeps customer utility transaction detail scoped to the owner", async () => {
    const { service } = serviceWith({
      prismaOverrides: {
        utilityTransaction: { findFirst: jest.fn().mockResolvedValue(null) }
      }
    });
    await expect(service.customerDetail("user-id", "transaction-id")).rejects.toBeInstanceOf(NotFoundException);
  });
});
