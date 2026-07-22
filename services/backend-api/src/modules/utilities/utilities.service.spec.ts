import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma,
  UtilityServiceType,
  UtilityTransactionStatus,
  WalletLedgerDirection,
  WalletLedgerEntryStatus,
  WalletLedgerEntryType,
  WalletStatus
} from "@prisma/client";
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
  txOverrides?: Record<string, unknown>;
  configValues?: Record<string, unknown>;
  accelerateProvider?: Partial<UtilityProviderClient> & { isConfigured?: jest.Mock };
} = {}) {
  const now = new Date();
  const transactionCreate = jest.fn().mockImplementation(({ data }) => Promise.resolve({
    ...data,
    id: "transaction-id",
    createdAt: now,
    updatedAt: now,
    completedAt: data.completedAt ?? null,
    provider,
    product
  }));
  const transactionUpdate = jest.fn().mockImplementation(({ data }) => Promise.resolve({
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
    metadata: data.metadata ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: data.completedAt ?? null,
    provider,
    product
  }));
  const tx = {
    utilityTransaction: {
      findFirst: jest.fn(),
      create: transactionCreate,
      update: transactionUpdate
    },
    customerWallet: {
      upsert: jest.fn().mockResolvedValue({
        id: "wallet-id",
        customerId: "customer-id",
        currency: "NGN",
        status: WalletStatus.ACTIVE,
        availableBalance: new Prisma.Decimal(1000),
        ledgerBalance: new Prisma.Decimal(1000)
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: "wallet-id",
        customerId: "customer-id",
        currency: "NGN",
        status: WalletStatus.ACTIVE,
        availableBalance: new Prisma.Decimal(500),
        ledgerBalance: new Prisma.Decimal(500)
      }),
      update: jest.fn()
    },
    customerWalletLedgerEntry: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: data.entryType === WalletLedgerEntryType.REVERSAL ? "ledger-reversal" : "ledger-debit",
        createdAt: now,
        postedAt: data.postedAt ?? null
      })),
      update: jest.fn()
    },
    ...options.txOverrides
  };
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
      create: transactionCreate,
      update: transactionUpdate
    },
    customerWallet: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    customerWalletLedgerEntry: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn((callback) => callback(tx)),
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
  return { prisma, tx, accelerateProvider, audit, service: new UtilitiesService(prisma, config, new MockUtilityProvider(), accelerateProvider, audit) };
}

const liveWalletUtilityConfig = {
  UTILITIES_PROVIDER: "accelerate",
  UTILITIES_ENABLED: true,
  UTILITIES_CUSTOMER_PURCHASES_ENABLED: true,
  ACCELERATE_ENABLED: true,
  UTILITIES_TEST_MODE: false,
  UTILITIES_WALLET_PAYMENT_ENABLED: true,
  UTILITIES_LIVE_FULFILLMENT_ENABLED: true
};

const successfulAccelerateProvider = {
  isConfigured: jest.fn().mockReturnValue(true),
  validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
  purchase: jest.fn().mockResolvedValue({
    status: UtilityTransactionStatus.SUCCESSFUL,
    providerStatus: "SUCCESSFUL",
    providerReference: "ACC-SUCCESS-123",
    customerNote: "Provider confirmed fulfilment.",
    metadata: { responseKeys: ["status", "reference"] }
  })
};

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

  it("blocks live utility purchases when wallet payment gates are missing", async () => {
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn()
    };
    const { tx, service } = serviceWith({
      configValues: {
        UTILITIES_PROVIDER: "accelerate",
        UTILITIES_ENABLED: true,
        UTILITIES_CUSTOMER_PURCHASE_ENABLED: true,
        ACCELERATE_ENABLED: true,
        UTILITIES_TEST_MODE: false
      },
      accelerateProvider
    });

    await expect(service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000"
    })).rejects.toThrow("Live Utilities require wallet payment and live fulfilment flags.");

    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(accelerateProvider.purchase).not.toHaveBeenCalled();
  });

  it("blocks wallet-funded utility purchase when wallet balance is insufficient", async () => {
    const accelerateProvider = {
      ...successfulAccelerateProvider,
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn()
    };
    const { tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      accelerateProvider
    });
    tx.customerWallet.upsert.mockResolvedValue({
      id: "wallet-id",
      customerId: "customer-id",
      currency: "NGN",
      status: WalletStatus.ACTIVE,
      availableBalance: new Prisma.Decimal(100),
      ledgerBalance: new Prisma.Decimal(100)
    });

    await expect(service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000",
      idempotencyKey: "KGO-UTIL-QUOTE-1"
    })).rejects.toThrow("Insufficient wallet balance. Please top up your wallet and try again.");

    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(accelerateProvider.purchase).not.toHaveBeenCalled();
  });

  it("debits the wallet once and finalises successful provider fulfilment", async () => {
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn().mockResolvedValue({
        status: UtilityTransactionStatus.SUCCESSFUL,
        providerStatus: "SUCCESSFUL",
        providerReference: "ACC-SUCCESS-123",
        customerNote: "Provider confirmed fulfilment.",
        metadata: { responseKeys: ["status", "reference"] }
      })
    };
    const { tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      accelerateProvider
    });

    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000",
      idempotencyKey: "KGO-UTIL-QUOTE-2"
    });

    expect(tx.customerWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-id" },
      data: expect.objectContaining({
        availableBalance: new Prisma.Decimal(500),
        ledgerBalance: new Prisma.Decimal(500)
      })
    });
    expect(tx.customerWalletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: WalletLedgerEntryType.SERVICE_PAYMENT,
        direction: WalletLedgerDirection.DEBIT,
        status: WalletLedgerEntryStatus.POSTED,
        reference: expect.stringContaining("-WALLET-DEBIT"),
        sourceType: "UTILITY_TRANSACTION"
      })
    });
    expect(accelerateProvider.purchase).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: UtilityTransactionStatus.SUCCESSFUL,
      paymentMethod: "WALLET",
      walletDebitReference: expect.stringContaining("-WALLET-DEBIT"),
      walletDebitStatus: WalletLedgerEntryStatus.POSTED
    });
  });

  it("reverses the wallet debit when provider fulfilment fails", async () => {
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn().mockResolvedValue({
        status: UtilityTransactionStatus.FAILED,
        providerStatus: "FAILED",
        providerReference: "ACC-FAILED-123",
        failureReason: "Provider rejected transaction.",
        metadata: { responseKeys: ["status", "reference"] }
      })
    };
    const { prisma, tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      accelerateProvider
    });
    (prisma.utilityTransaction.findUnique as jest.Mock).mockImplementation(({ where }: { where: { id?: string; reference?: string } }) => {
      if (where.id === "transaction-id") {
        return Promise.resolve({
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
          status: UtilityTransactionStatus.FAILED,
          providerStatus: "FAILED",
          providerReference: "ACC-FAILED-123",
          mockToken: null,
          customerNote: "Utility payment failed. Your wallet reversal will be confirmed if a debit was posted.",
          failureReason: "Provider rejected transaction.",
          metadata: {
            mode: "accelerate",
            testMode: false,
            paymentMethod: "WALLET",
            walletDebitLedgerEntryId: "ledger-debit",
            walletDebitReference: "KGO-UTIL-REFERENCE-WALLET-DEBIT",
            walletDebitStatus: WalletLedgerEntryStatus.POSTED
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          provider,
          product
        });
      }
      return Promise.resolve(null);
    });
    tx.customerWalletLedgerEntry.findUnique.mockImplementation(({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
      if (where.id === "ledger-debit") {
        return Promise.resolve({
          id: "ledger-debit",
          walletId: "wallet-id",
          customerId: "customer-id",
          status: WalletLedgerEntryStatus.POSTED,
          amount: new Prisma.Decimal(500),
          reference: "KGO-UTIL-REFERENCE-WALLET-DEBIT",
          metadata: null
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000",
      idempotencyKey: "KGO-UTIL-QUOTE-3"
    });

    expect(tx.customerWalletLedgerEntry.update).toHaveBeenCalledWith({
      where: { id: "ledger-debit" },
      data: expect.objectContaining({ status: WalletLedgerEntryStatus.REVERSED })
    });
    expect(tx.customerWalletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryType: WalletLedgerEntryType.REVERSAL,
        direction: WalletLedgerDirection.CREDIT,
        status: WalletLedgerEntryStatus.POSTED,
        reference: expect.stringContaining("-WALLET-REVERSAL"),
        sourceType: "UTILITY_TRANSACTION_REVERSAL"
      })
    });
    expect(result).toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      customerNote: "Utility payment failed. Your wallet has been reversed.",
      walletDebitStatus: WalletLedgerEntryStatus.REVERSED,
      walletReversalReference: expect.stringContaining("-WALLET-REVERSAL")
    });
  });

  it("keeps provider-pending fulfilment pending without reversing the wallet", async () => {
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn().mockResolvedValue({
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "PROCESSING",
        providerReference: "ACC-PENDING-123",
        customerNote: "Your request is being processed.",
        metadata: { responseKeys: ["status", "reference"] }
      })
    };
    const { tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      accelerateProvider
    });

    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000",
      idempotencyKey: "KGO-UTIL-QUOTE-4"
    });

    expect(result).toMatchObject({
      status: UtilityTransactionStatus.PROCESSING,
      paymentMethod: "WALLET",
      walletDebitReference: expect.stringContaining("-WALLET-DEBIT")
    });
    expect(tx.customerWalletLedgerEntry.update).not.toHaveBeenCalled();
    expect(accelerateProvider.purchase).toHaveBeenCalledTimes(1);
  });

  it("returns an idempotent wallet-funded utility transaction without double debit", async () => {
    const existingTransaction = {
      id: "transaction-existing",
      reference: "KGO-UTIL-EXISTING",
      customerId: "customer-id",
      serviceType: provider.type,
      providerId: provider.id,
      productId: product.id,
      amountKobo: 50000,
      convenienceFeeKobo: 0,
      totalKobo: 50000,
      recipient: "+2348030000000",
      recipientName: null,
      status: UtilityTransactionStatus.SUCCESSFUL,
      providerStatus: "SUCCESSFUL",
      providerReference: "ACC-SUCCESS-123",
      mockToken: null,
      customerNote: "Provider confirmed fulfilment.",
      failureReason: null,
      metadata: {
        mode: "accelerate",
        testMode: false,
        paymentMethod: "WALLET",
        walletDebitReference: "KGO-UTIL-EXISTING-WALLET-DEBIT",
        walletDebitStatus: WalletLedgerEntryStatus.POSTED
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
      provider,
      product
    };
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn(),
      purchase: jest.fn()
    };
    const { prisma, tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      prismaOverrides: {
        customerWalletLedgerEntry: {
          findUnique: jest.fn().mockResolvedValue({
            id: "ledger-existing",
            sourceId: "transaction-existing",
            idempotencyKey: "utility:customer-id:KGO-UTIL-QUOTE-5"
          })
        },
        utilityTransaction: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(existingTransaction),
          create: jest.fn(),
          update: jest.fn()
        }
      },
      accelerateProvider
    });

    const result = await service.createTransaction("user-id", {
      serviceType: UtilityServiceType.AIRTIME,
      providerId: provider.id,
      amountKobo: 50000,
      recipient: "08030000000",
      idempotencyKey: "KGO-UTIL-QUOTE-5"
    });

    expect(result).toMatchObject({
      id: "transaction-existing",
      status: UtilityTransactionStatus.SUCCESSFUL,
      paymentMethod: "WALLET",
      walletDebitReference: "KGO-UTIL-EXISTING-WALLET-DEBIT"
    });
    expect(tx.customerWallet.update).not.toHaveBeenCalled();
    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(accelerateProvider.purchase).not.toHaveBeenCalled();
    expect(prisma.utilityTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "transaction-existing", customerId: "customer-id" }
    }));
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

    expect(accelerateProvider.checkStatus).toHaveBeenCalledWith("ACC-123", provider.type);
    expect(prisma.utilityTransaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: UtilityTransactionStatus.SUCCESSFUL })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-id", "admin.utilities.provider_verify", "UtilityTransaction", "transaction-id", expect.any(Object));
    expect(result).toMatchObject({ status: UtilityTransactionStatus.SUCCESSFUL, providerMode: "accelerate" });
  });

  it("blocks live data purchases with unmapped demo product codes before wallet debit", async () => {
    const dataProvider = {
      ...provider,
      type: UtilityServiceType.DATA,
      name: "MTN Data",
      code: "DEMO_MTN_DATA_PROVIDER"
    };
    const dataProduct = {
      ...product,
      type: UtilityServiceType.DATA,
      name: "MTN 1GB Data Demo Plan",
      code: "DEMO_MTN_1GB",
      amountKobo: 50000,
      minAmountKobo: 50000,
      maxAmountKobo: 50000
    };
    const accelerateProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      validateRecipient: jest.fn().mockResolvedValue({ isValid: true, normalizedRecipient: "+2348030000000" }),
      purchase: jest.fn()
    };
    const { tx, service } = serviceWith({
      configValues: liveWalletUtilityConfig,
      prismaOverrides: {
        utilityProvider: {
          findMany: jest.fn().mockResolvedValue([dataProvider]),
          findFirst: jest.fn().mockResolvedValue(dataProvider)
        },
        utilityProduct: {
          findMany: jest.fn().mockResolvedValue([dataProduct]),
          findFirst: jest.fn().mockResolvedValue(dataProduct)
        }
      },
      accelerateProvider
    });

    await expect(service.createTransaction("user-id", {
      serviceType: UtilityServiceType.DATA,
      providerId: dataProvider.id,
      productId: dataProduct.id,
      amountKobo: 50000,
      recipient: "08030000000"
    })).rejects.toThrow("This utility product is currently unavailable.");

    expect(tx.customerWallet.upsert).not.toHaveBeenCalled();
    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(accelerateProvider.purchase).not.toHaveBeenCalled();
  });

  it("does not duplicate wallet reversal on repeated provider failure verification", async () => {
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
      metadata: {
        mode: "accelerate",
        testMode: false,
        paymentMethod: "WALLET",
        walletDebitLedgerEntryId: "ledger-debit",
        walletDebitReference: "KGO-UTIL-REFERENCE-WALLET-DEBIT",
        walletDebitStatus: WalletLedgerEntryStatus.POSTED
      },
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
        status: UtilityTransactionStatus.FAILED,
        providerStatus: "FAILED",
        providerReference: "ACC-123",
        failureReason: "Provider confirmed failure.",
        metadata: { responseKeys: ["status"] }
      })
    };
    const { tx, service } = serviceWith({
      prismaOverrides: {
        utilityTransaction: {
          findUnique: jest.fn().mockResolvedValue(processingTransaction),
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
            ...processingTransaction,
            ...data,
            metadata: data.metadata ?? processingTransaction.metadata,
            status: data.status ?? processingTransaction.status
          }))
        }
      },
      txOverrides: {
        utilityTransaction: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
            ...processingTransaction,
            ...data,
            metadata: data.metadata ?? processingTransaction.metadata,
            status: data.status ?? processingTransaction.status,
            customer: processingTransaction.customer
          }))
        },
        customerWalletLedgerEntry: {
          findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
            if (where.id === "ledger-debit") {
              return Promise.resolve({
                id: "ledger-debit",
                walletId: "wallet-id",
                customerId: "customer-id",
                status: WalletLedgerEntryStatus.POSTED,
                amount: new Prisma.Decimal(500),
                reference: "KGO-UTIL-REFERENCE-WALLET-DEBIT",
                metadata: null
              });
            }
            if (where.idempotencyKey === "utility:KGO-UTIL-REFERENCE:wallet-reversal") {
              return Promise.resolve({
                id: "ledger-reversal",
                reference: "KGO-UTIL-REFERENCE-WALLET-REVERSAL",
                status: WalletLedgerEntryStatus.POSTED
              });
            }
            return Promise.resolve(null);
          }),
          create: jest.fn(),
          update: jest.fn()
        }
      },
      accelerateProvider
    });

    const result = await service.adminVerifyProviderStatus("admin-id", "transaction-id");

    expect(result).toMatchObject({
      status: UtilityTransactionStatus.FAILED,
      walletDebitStatus: "REVERSED",
      walletReversalReference: "KGO-UTIL-REFERENCE-WALLET-REVERSAL"
    });
    expect(tx.customerWallet.update).not.toHaveBeenCalled();
    expect(tx.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
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
