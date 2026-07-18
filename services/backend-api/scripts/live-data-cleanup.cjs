#!/usr/bin/env node

const {
  AccountStatus,
  AdCampaignStatus,
  CashCollectionStatus,
  DeliveryCaptainApplicationStatus,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  RiderStatus,
  TaxiApplicationStatus,
  VendorApplicationStatus,
  VendorServiceStatus,
  VendorStatus,
  WalletLedgerEntryStatus,
  WalletStatus
} = require("@prisma/client");

const prisma = new PrismaClient();

const PRESERVED_SUPER_ADMIN = {
  email: "karigoapp@gmail.com",
  localPhone: "08055333358",
  normalizedPhone: "+2348055333358"
};

const DRY_RUN = process.env.DRY_RUN !== "false";
const CONFIRMED = process.env.CONFIRM_LIVE_CLEANUP === "true";
const TEST_TERMS = ["demo", "staging", "sample", "test", "qa"];
const CLOSED_ORDER_STATUSES = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED, OrderStatus.REFUNDED];

function containsFilter(field) {
  return TEST_TERMS.map((term) => ({ [field]: { contains: term, mode: "insensitive" } }));
}

function syntheticUserWhere() {
  return {
    deletedAt: null,
    NOT: [
      { email: PRESERVED_SUPER_ADMIN.email },
      { phoneNumber: PRESERVED_SUPER_ADMIN.localPhone },
      { phoneNumber: PRESERVED_SUPER_ADMIN.normalizedPhone }
    ],
    OR: [
      ...containsFilter("fullName"),
      ...containsFilter("email"),
      ...containsFilter("phoneNumber")
    ]
  };
}

function ids(items, key = "id") {
  return [...new Set(items.map((item) => item?.[key]).filter(Boolean))];
}

function logSection(title, rows) {
  console.log(`\n${title}`);
  for (const [label, value] of Object.entries(rows)) {
    console.log(`- ${label}: ${value}`);
  }
}

async function collectCandidates() {
  const users = await prisma.user.findMany({
    where: syntheticUserWhere(),
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      customerProfile: { select: { id: true } },
      vendor: { select: { id: true } },
      rider: { select: { id: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const userIds = ids(users);
  const customerIds = ids(users.map((user) => user.customerProfile));
  const vendorIds = ids(users.map((user) => user.vendor));
  const riderIds = ids(users.map((user) => user.rider));

  const [vendorApplications, deliveryCaptainApplications, rideApplications, orders] = await Promise.all([
    prisma.vendorApplication.findMany({
      where: {
        OR: [
          { applicantUserId: { in: userIds } },
          { vendorId: { in: vendorIds } },
          ...containsFilter("reference"),
          ...containsFilter("businessName"),
          ...containsFilter("businessEmail"),
          ...containsFilter("contactEmail")
        ]
      },
      select: { id: true, reference: true, status: true, vendorId: true, applicantUserId: true }
    }),
    prisma.deliveryCaptainApplication.findMany({
      where: {
        OR: [
          { applicantUserId: { in: userIds } },
          ...containsFilter("applicationReference"),
          ...containsFilter("fullName"),
          ...containsFilter("email")
        ]
      },
      select: { id: true, applicationReference: true, status: true, applicantUserId: true }
    }),
    prisma.taxiDriverApplication.findMany({
      where: {
        OR: [
          { applicantUserId: { in: userIds } },
          ...containsFilter("applicationReference"),
          ...containsFilter("fullName"),
          ...containsFilter("email")
        ]
      },
      select: { id: true, applicationReference: true, status: true, applicantUserId: true }
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { customerId: { in: customerIds } },
          { vendorId: { in: vendorIds } },
          { riderId: { in: riderIds } },
          ...containsFilter("orderNumber")
        ]
      },
      select: { id: true, orderNumber: true, orderStatus: true, paymentStatus: true }
    })
  ]);

  const orderIds = ids(orders);
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { customerId: { in: customerIds } },
        { orderId: { in: orderIds } },
        ...containsFilter("transactionReference")
      ]
    },
    select: { id: true, transactionReference: true, gateway: true, paymentStatus: true, paymentPurpose: true }
  });

  const wallets = await prisma.customerWallet.findMany({
    where: { customerId: { in: customerIds } },
    select: { id: true, customerId: true, status: true }
  });
  const walletIds = ids(wallets);
  const walletLedgerEntries = await prisma.customerWalletLedgerEntry.findMany({
    where: {
      OR: [
        { customerId: { in: customerIds } },
        { walletId: { in: walletIds } },
        ...containsFilter("reference")
      ]
    },
    select: { id: true, reference: true, status: true, entryType: true }
  });

  const [vendorSettlements, riderEarnings, adCampaigns] = await Promise.all([
    prisma.vendorSettlement.findMany({
      where: { OR: [{ vendorId: { in: vendorIds } }, { orderId: { in: orderIds } }] },
      select: { id: true, settlementStatus: true }
    }),
    prisma.riderEarning.findMany({
      where: { OR: [{ riderId: { in: riderIds } }, { orderId: { in: orderIds } }] },
      select: { id: true, payoutStatus: true }
    }),
    prisma.adCampaign.findMany({
      where: {
        OR: [
          { vendorId: { in: vendorIds } },
          ...containsFilter("campaignReference"),
          ...containsFilter("title"),
          ...containsFilter("advertiserEmail")
        ]
      },
      select: { id: true, campaignReference: true, status: true }
    })
  ]);

  return {
    users,
    userIds,
    customerIds,
    vendorIds,
    riderIds,
    vendorApplications,
    deliveryCaptainApplications,
    rideApplications,
    orders,
    orderIds,
    payments,
    wallets,
    walletLedgerEntries,
    vendorSettlements,
    riderEarnings,
    adCampaigns
  };
}

async function applyCleanup(candidates) {
  const now = new Date();
  const summary = {};

  const setCount = (label, result) => {
    summary[label] = result.count ?? 0;
  };

  await prisma.$transaction(async (tx) => {
    setCount("ordersCancelled", await tx.order.updateMany({
      where: { id: { in: candidates.orderIds }, orderStatus: { notIn: CLOSED_ORDER_STATUSES } },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        cashCollectionStatus: CashCollectionStatus.CANCELLED,
        cancellationReason: "Task 173 confirmed live cleanup of known test/demo data."
      }
    }));
    setCount("pendingPaymentsCancelled", await tx.payment.updateMany({
      where: { id: { in: ids(candidates.payments) }, paymentStatus: PaymentStatus.PENDING },
      data: { paymentStatus: PaymentStatus.CANCELLED }
    }));
    setCount("pendingWalletEntriesCancelled", await tx.customerWalletLedgerEntry.updateMany({
      where: { id: { in: ids(candidates.walletLedgerEntries) }, status: WalletLedgerEntryStatus.PENDING },
      data: { status: WalletLedgerEntryStatus.CANCELLED, reversedAt: now }
    }));
    setCount("walletsSuspended", await tx.customerWallet.updateMany({
      where: { id: { in: ids(candidates.wallets) } },
      data: { status: WalletStatus.SUSPENDED }
    }));
    setCount("vendorApplicationsWithdrawn", await tx.vendorApplication.updateMany({
      where: {
        id: { in: ids(candidates.vendorApplications) },
        status: { in: [VendorApplicationStatus.SUBMITTED, VendorApplicationStatus.UNDER_REVIEW, VendorApplicationStatus.CHANGES_REQUESTED, VendorApplicationStatus.PROVISIONALLY_APPROVED] }
      },
      data: { status: VendorApplicationStatus.WITHDRAWN }
    }));
    setCount("deliveryCaptainApplicationsRejected", await tx.deliveryCaptainApplication.updateMany({
      where: {
        id: { in: ids(candidates.deliveryCaptainApplications) },
        status: { in: [DeliveryCaptainApplicationStatus.SUBMITTED, DeliveryCaptainApplicationStatus.UNDER_REVIEW, DeliveryCaptainApplicationStatus.CHANGES_REQUESTED, DeliveryCaptainApplicationStatus.PROVISIONALLY_APPROVED] }
      },
      data: {
        status: DeliveryCaptainApplicationStatus.REJECTED,
        adminNote: "Task 173 confirmed live cleanup of known test/demo data."
      }
    }));
    setCount("rideApplicationsRejected", await tx.taxiDriverApplication.updateMany({
      where: {
        id: { in: ids(candidates.rideApplications) },
        status: { in: [TaxiApplicationStatus.SUBMITTED, TaxiApplicationStatus.UNDER_REVIEW, TaxiApplicationStatus.CHANGES_REQUESTED, TaxiApplicationStatus.PROVISIONALLY_APPROVED] }
      },
      data: {
        status: TaxiApplicationStatus.REJECTED,
        adminNote: "Task 173 confirmed live cleanup of known test/demo data."
      }
    }));
    setCount("adCampaignsCancelled", await tx.adCampaign.updateMany({
      where: {
        id: { in: ids(candidates.adCampaigns) },
        status: { in: [AdCampaignStatus.DRAFT, AdCampaignStatus.SUBMITTED, AdCampaignStatus.UNDER_REVIEW, AdCampaignStatus.APPROVED, AdCampaignStatus.ACTIVE, AdCampaignStatus.PAUSED] }
      },
      data: {
        status: AdCampaignStatus.CANCELLED,
        adminNote: "Task 173 confirmed live cleanup of known test/demo data."
      }
    }));
    setCount("productsArchived", await tx.product.updateMany({
      where: { vendorId: { in: candidates.vendorIds } },
      data: { isActive: false, isAvailable: false, deletedAt: now }
    }));
    setCount("servicesArchived", await tx.vendorService.updateMany({
      where: { vendorId: { in: candidates.vendorIds } },
      data: { status: VendorServiceStatus.ARCHIVED, isAvailable: false, deletedAt: now }
    }));
    setCount("vendorsArchived", await tx.vendor.updateMany({
      where: { id: { in: candidates.vendorIds } },
      data: { status: VendorStatus.CLOSED, isOpen: false, deletedAt: now }
    }));
    setCount("captainsArchived", await tx.rider.updateMany({
      where: { id: { in: candidates.riderIds } },
      data: { verificationStatus: RiderStatus.SUSPENDED, availabilityStatus: RiderStatus.OFFLINE, deletedAt: now }
    }));
    setCount("usersDeactivated", await tx.user.updateMany({
      where: {
        id: { in: candidates.userIds },
        NOT: [
          { email: PRESERVED_SUPER_ADMIN.email },
          { phoneNumber: PRESERVED_SUPER_ADMIN.localPhone },
          { phoneNumber: PRESERVED_SUPER_ADMIN.normalizedPhone }
        ]
      },
      data: { accountStatus: AccountStatus.DEACTIVATED, deletedAt: now }
    }));
    setCount("refreshTokensRevoked", await tx.refreshToken.updateMany({
      where: { userId: { in: candidates.userIds }, revokedAt: null },
      data: { revokedAt: now }
    }));
    setCount("deviceTokensDisabled", await tx.deviceToken.updateMany({
      where: { userId: { in: candidates.userIds }, isActive: true },
      data: { isActive: false }
    }));

    const superAdmin = await tx.user.findFirst({
      where: {
        OR: [
          { email: PRESERVED_SUPER_ADMIN.email },
          { phoneNumber: PRESERVED_SUPER_ADMIN.localPhone },
          { phoneNumber: PRESERVED_SUPER_ADMIN.normalizedPhone }
        ]
      },
      select: { id: true }
    });
    if (superAdmin) {
      await tx.adminAuditLog.create({
        data: {
          adminUserId: superAdmin.id,
          action: "admin.live_cleanup.task173",
          entityType: "LiveCleanup",
          newValue: {
            dryRun: false,
            preservedSuperAdmin: PRESERVED_SUPER_ADMIN.email,
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
    throw new Error("Refusing to mutate data. Keep DRY_RUN=true or set CONFIRM_LIVE_CLEANUP=true with DRY_RUN=false.");
  }

  const candidates = await collectCandidates();
  logSection("Task 173 live cleanup mode", {
    dryRun: DRY_RUN,
    confirmationRequiredForMutation: true,
    confirmationPresent: CONFIRMED,
    preservedSuperAdminEmail: PRESERVED_SUPER_ADMIN.email,
    preservedSuperAdminPhone: `${PRESERVED_SUPER_ADMIN.localPhone} / ${PRESERVED_SUPER_ADMIN.normalizedPhone}`
  });
  logSection("Candidate counts", {
    users: candidates.users.length,
    customers: candidates.customerIds.length,
    vendors: candidates.vendorIds.length,
    captains: candidates.riderIds.length,
    vendorApplications: candidates.vendorApplications.length,
    deliveryCaptainApplications: candidates.deliveryCaptainApplications.length,
    rideApplications: candidates.rideApplications.length,
    orders: candidates.orders.length,
    payments: candidates.payments.length,
    wallets: candidates.wallets.length,
    walletLedgerEntries: candidates.walletLedgerEntries.length,
    vendorSettlements: candidates.vendorSettlements.length,
    riderEarnings: candidates.riderEarnings.length,
    adCampaigns: candidates.adCampaigns.length
  });

  if (DRY_RUN) {
    console.log("\nDry run only. No records were changed. Review counts before rerunning with DRY_RUN=false and CONFIRM_LIVE_CLEANUP=true.");
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
