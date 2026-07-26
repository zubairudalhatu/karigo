#!/usr/bin/env node

const {
  AccountStatus,
  CashCollectionStatus,
  OrderStatus,
  PrismaClient,
  RiderStatus,
  ServiceProviderRequestStatus,
  ServiceProviderStatus,
  VendorServiceStatus,
  VendorStatus
} = require("@prisma/client");

const prisma = new PrismaClient();

const DRY_RUN = process.env.CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN !== "false";
const CONFIRMED = process.env.CONFIRM_PRODUCTION_DEMO_CLEANUP === "true";
const CLEANUP_NOTE = "Task 194 production demo-data cleanup: archived known seeded/demo records.";

const DEMO_ACCOUNT_PHONES = [
  "+2348000000001",
  "+2348000000101",
  "+2348000000102",
  "+2348000000103",
  "+2348000000201",
  "+2348000000401"
];

const DEMO_ACCOUNT_EMAILS = [
  "operations@karigo.local",
  "vendor@karigo.local",
  "grocery-vendor@karigo.local",
  "market-vendor@karigo.local",
  "customer@karigo.local",
  "rider@karigo.local"
];

const DEMO_ACCOUNT_NAMES = [
  "KariGO Demo Operations Admin",
  "Kano Kitchen Vendor",
  "Kano Fresh Mart Vendor",
  "Kano Everyday Market Vendor",
  "KariGO Sample Customer",
  "KariGO Sample Rider"
];

const DEMO_VENDOR_NAMES = ["Kano Kitchen", "Kano Fresh Mart", "Kano Everyday Market"];
const DEMO_ORDER_NUMBERS = ["KGO-SEED-PARCEL-001"];
const DEMO_RIDER_CODES = ["KGO-RIDER-SAMPLE"];
const DEMO_TERMS = ["demo", "sample", "staging"];

function ids(items, key = "id") {
  return [...new Set(items.map((item) => item?.[key]).filter(Boolean))];
}

function containsAny(field) {
  return DEMO_TERMS.map((term) => ({ [field]: { contains: term, mode: "insensitive" } }));
}

function logSection(title, rows) {
  console.log(`\n${title}`);
  for (const [label, value] of Object.entries(rows)) {
    console.log(`- ${label}: ${value}`);
  }
}

async function collectCandidates() {
  const demoUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      NOT: [{ adminRole: "SUPER_ADMIN" }],
      OR: [
        { phoneNumber: { in: DEMO_ACCOUNT_PHONES } },
        { email: { in: DEMO_ACCOUNT_EMAILS } },
        { fullName: { in: DEMO_ACCOUNT_NAMES } }
      ]
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      customerProfile: { select: { id: true } },
      vendor: { select: { id: true } },
      rider: { select: { id: true } }
    }
  });

  const demoUserIds = ids(demoUsers);
  const demoCustomerIds = ids(demoUsers.map((user) => user.customerProfile));
  const demoRiderIds = ids(demoUsers.map((user) => user.rider));
  const demoVendorUserIds = ids(demoUsers.filter((user) => user.role === "VENDOR"));

  const demoVendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { userId: { in: demoVendorUserIds } },
        { businessName: { in: DEMO_VENDOR_NAMES } },
        { email: { in: DEMO_ACCOUNT_EMAILS } }
      ]
    },
    select: { id: true, businessName: true, status: true, userId: true }
  });
  const demoVendorIds = ids(demoVendors);

  const [
    demoProducts,
    demoVendorServices,
    demoRiders,
    demoUtilityProviders,
    demoUtilityProducts,
    seededOrders,
    linkedOrders,
    linkedPayments,
    linkedWallets,
    linkedUtilityTransactions,
    demoServiceProviders,
    demoServiceRequests
  ] = await Promise.all([
    prisma.product.findMany({
      where: { vendorId: { in: demoVendorIds }, deletedAt: null },
      select: { id: true, name: true, vendorId: true }
    }),
    prisma.vendorService.findMany({
      where: { vendorId: { in: demoVendorIds }, deletedAt: null },
      select: { id: true, name: true, vendorId: true, status: true }
    }),
    prisma.rider.findMany({
      where: {
        OR: [
          { id: { in: demoRiderIds } },
          { riderCode: { in: DEMO_RIDER_CODES } }
        ]
      },
      select: { id: true, riderCode: true, userId: true, verificationStatus: true }
    }),
    prisma.utilityProvider.findMany({
      where: { code: { startsWith: "DEMO_" } },
      select: { id: true, name: true, code: true, isActive: true }
    }),
    prisma.utilityProduct.findMany({
      where: { code: { startsWith: "DEMO_" } },
      select: { id: true, name: true, code: true, providerId: true, isActive: true }
    }),
    prisma.order.findMany({
      where: { orderNumber: { in: DEMO_ORDER_NUMBERS } },
      select: { id: true, orderNumber: true, orderStatus: true, paymentStatus: true }
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { customerId: { in: demoCustomerIds } },
          { vendorId: { in: demoVendorIds } },
          { riderId: { in: demoRiderIds } }
        ]
      },
      select: { id: true, orderNumber: true, orderStatus: true, paymentStatus: true }
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { customerId: { in: demoCustomerIds } },
          { order: { is: { orderNumber: { in: DEMO_ORDER_NUMBERS } } } }
        ]
      },
      select: { id: true, transactionReference: true, paymentStatus: true, paymentPurpose: true }
    }),
    prisma.customerWallet.findMany({
      where: { customerId: { in: demoCustomerIds } },
      select: { id: true, customerId: true, status: true }
    }),
    prisma.utilityTransaction.findMany({
      where: {
        OR: [
          { customerId: { in: demoCustomerIds } },
          { provider: { is: { code: { startsWith: "DEMO_" } } } },
          { product: { is: { code: { startsWith: "DEMO_" } } } }
        ]
      },
      select: { id: true, reference: true, status: true, providerId: true, productId: true }
    }),
    prisma.serviceProvider.findMany({
      where: {
        OR: [
          ...containsAny("fullName"),
          ...containsAny("businessName"),
          ...containsAny("email")
        ]
      },
      select: { id: true, providerCode: true, fullName: true, businessName: true, status: true }
    }),
    prisma.serviceProviderRequest.findMany({
      where: {
        OR: [
          { customerId: { in: demoCustomerIds } },
          ...containsAny("requestNumber"),
          ...containsAny("serviceLabel"),
          ...containsAny("description")
        ]
      },
      select: { id: true, requestNumber: true, status: true, customerId: true }
    })
  ]);

  return {
    demoUsers,
    demoUserIds,
    demoCustomerIds,
    demoVendors,
    demoVendorIds,
    demoProducts,
    demoVendorServices,
    demoRiders,
    demoRiderIds: ids(demoRiders),
    demoUtilityProviders,
    demoUtilityProducts,
    seededOrders,
    linkedOrders,
    linkedPayments,
    linkedWallets,
    linkedUtilityTransactions,
    demoServiceProviders,
    demoServiceRequests
  };
}

async function applyCleanup(candidates) {
  const now = new Date();
  const summary = {};
  const count = (label, result) => {
    summary[label] = result.count ?? 0;
  };

  await prisma.$transaction(async (tx) => {
    count("utilityProductsDisabled", await tx.utilityProduct.updateMany({
      where: { id: { in: ids(candidates.demoUtilityProducts) } },
      data: { isActive: false }
    }));
    count("utilityProvidersDisabled", await tx.utilityProvider.updateMany({
      where: { id: { in: ids(candidates.demoUtilityProviders) } },
      data: { isActive: false }
    }));
    count("productOptionGroupsDisabled", await tx.productOptionGroup.updateMany({
      where: { productId: { in: ids(candidates.demoProducts) } },
      data: { isActive: false }
    }));
    count("productsArchived", await tx.product.updateMany({
      where: { id: { in: ids(candidates.demoProducts) } },
      data: { isActive: false, isAvailable: false, deletedAt: now }
    }));
    count("vendorServicesArchived", await tx.vendorService.updateMany({
      where: { id: { in: ids(candidates.demoVendorServices) } },
      data: { status: VendorServiceStatus.ARCHIVED, isAvailable: false, deletedAt: now }
    }));
    count("vendorsClosed", await tx.vendor.updateMany({
      where: { id: { in: candidates.demoVendorIds } },
      data: { status: VendorStatus.CLOSED, isOpen: false, deletedAt: now }
    }));
    count("captainsSuspended", await tx.rider.updateMany({
      where: { id: { in: candidates.demoRiderIds } },
      data: { verificationStatus: RiderStatus.SUSPENDED, availabilityStatus: RiderStatus.OFFLINE, deletedAt: now }
    }));
    count("serviceProvidersInactivated", await tx.serviceProvider.updateMany({
      where: { id: { in: ids(candidates.demoServiceProviders) } },
      data: { status: ServiceProviderStatus.INACTIVE, notes: CLEANUP_NOTE }
    }));
    count("serviceRequestsCancelled", await tx.serviceProviderRequest.updateMany({
      where: {
        id: { in: ids(candidates.demoServiceRequests) },
        status: { notIn: [ServiceProviderRequestStatus.CANCELLED, ServiceProviderRequestStatus.COMPLETED] }
      },
      data: { status: ServiceProviderRequestStatus.CANCELLED, adminNote: CLEANUP_NOTE }
    }));
    count("seededOrdersCancelled", await tx.order.updateMany({
      where: {
        id: { in: ids(candidates.seededOrders) },
        orderStatus: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED, OrderStatus.REFUNDED] }
      },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        cashCollectionStatus: CashCollectionStatus.CANCELLED,
        cancellationReason: CLEANUP_NOTE
      }
    }));
    count("demoUsersDeactivated", await tx.user.updateMany({
      where: { id: { in: candidates.demoUserIds }, NOT: [{ adminRole: "SUPER_ADMIN" }] },
      data: { accountStatus: AccountStatus.DEACTIVATED, deletedAt: now }
    }));
    count("refreshTokensRevoked", await tx.refreshToken.updateMany({
      where: { userId: { in: candidates.demoUserIds }, revokedAt: null },
      data: { revokedAt: now }
    }));
    count("deviceTokensDisabled", await tx.deviceToken.updateMany({
      where: { userId: { in: candidates.demoUserIds }, isActive: true },
      data: { isActive: false }
    }));

    const superAdmin = await tx.user.findFirst({
      where: { role: "ADMIN", adminRole: "SUPER_ADMIN", accountStatus: AccountStatus.ACTIVE },
      select: { id: true },
      orderBy: { createdAt: "asc" }
    });
    if (superAdmin) {
      await tx.adminAuditLog.create({
        data: {
          adminUserId: superAdmin.id,
          action: "admin.production_demo_cleanup.task194",
          entityType: "ProductionDemoDataCleanup",
          newValue: {
            dryRun: false,
            knownSeededVendors: DEMO_VENDOR_NAMES,
            skippedHardDeletes: true,
            linkedRecordsRetained: {
              linkedOrders: candidates.linkedOrders.length,
              linkedPayments: candidates.linkedPayments.length,
              linkedWallets: candidates.linkedWallets.length,
              linkedUtilityTransactions: candidates.linkedUtilityTransactions.length
            },
            summary
          }
        }
      });
    }
  });

  return summary;
}

async function main() {
  if (!DRY_RUN && !CONFIRMED) {
    throw new Error("Refusing to mutate data. Keep CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN=true or set CONFIRM_PRODUCTION_DEMO_CLEANUP=true with CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN=false.");
  }

  const candidates = await collectCandidates();
  logSection("Task 194 production demo cleanup mode", {
    dryRun: DRY_RUN,
    confirmationRequiredForMutation: true,
    confirmationPresent: CONFIRMED,
    hardDeletes: "no",
    cleanupNote: CLEANUP_NOTE
  });
  logSection("Candidate counts", {
    demoUsers: candidates.demoUsers.length,
    demoVendors: candidates.demoVendors.length,
    demoProducts: candidates.demoProducts.length,
    demoVendorServices: candidates.demoVendorServices.length,
    demoCaptains: candidates.demoRiders.length,
    demoUtilityProviders: candidates.demoUtilityProviders.length,
    demoUtilityProducts: candidates.demoUtilityProducts.length,
    seededOrders: candidates.seededOrders.length,
    linkedOrdersRetained: candidates.linkedOrders.length,
    linkedPaymentsRetained: candidates.linkedPayments.length,
    linkedWalletsRetained: candidates.linkedWallets.length,
    linkedUtilityTransactionsRetained: candidates.linkedUtilityTransactions.length,
    demoServiceProviders: candidates.demoServiceProviders.length,
    demoServiceRequests: candidates.demoServiceRequests.length
  });

  if (DRY_RUN) {
    console.log("\nDry run only. No records were changed. Review counts before rerunning with CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN=false and CONFIRM_PRODUCTION_DEMO_CLEANUP=true.");
    return;
  }

  const summary = await applyCleanup(candidates);
  logSection("Cleanup mutations applied", summary);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
