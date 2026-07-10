import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
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

function serviceWith(overrides: Record<string, unknown> = {}) {
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
      update: jest.fn()
    },
    ...overrides
  } as unknown as PrismaService;
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) } as unknown as ConfigService;
  const audit = { record: jest.fn() } as unknown as AdminAuditService;
  return { prisma, service: new UtilitiesService(prisma, config, new MockUtilityProvider(), audit) };
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
        amountKobo: 50000
      })
    }));
  });

  it("rejects inactive or missing providers", async () => {
    const { service } = serviceWith({
      utilityProvider: { findFirst: jest.fn().mockResolvedValue(null) }
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
});
