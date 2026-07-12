import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  CustomerReferralProfileStatus,
  CustomerReferralStatus,
  Prisma,
  ReferralRewardTrigger,
  ReferralRewardType
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ReferralsService } from "./referrals.service";

const now = new Date("2026-07-12T12:00:00.000Z");
const customer = { id: "customer-1", referralCode: "KGO-CUSTOMER" };
const referralProfile = {
  id: "profile-1",
  customerId: customer.id,
  code: customer.referralCode,
  status: CustomerReferralProfileStatus.ACTIVE,
  shareEnabled: true,
  totalReferrals: 1,
  activatedReferrals: 0,
  eligibleReferrals: 0,
  lastReferralAt: now,
  createdAt: now,
  updatedAt: now
};
const referral = {
  id: "referral-1",
  referrerProfileId: referralProfile.id,
  referrerCustomerId: customer.id,
  referredCustomerId: "customer-2",
  referralCode: referralProfile.code,
  status: CustomerReferralStatus.REGISTERED,
  rewardRuleId: null,
  accountActivatedAt: null,
  firstValidTransactionAt: null,
  eligibleAt: null,
  rewardReviewedAt: null,
  rewardIssuedAt: null,
  adminNote: null,
  metadata: null,
  createdAt: now,
  updatedAt: now,
  referrerProfile: referralProfile,
  referrerCustomer: {
    id: customer.id,
    user: { id: "user-1", fullName: "Referrer Customer", phoneNumber: "+2348011111111", email: "referrer@karigo.local" }
  },
  referredCustomer: {
    id: "customer-2",
    user: { id: "user-2", fullName: "Referred Customer", phoneNumber: "+2348022222222", email: "referred@karigo.local" }
  },
  rewardRule: null
};
const rewardRule = {
  id: "rule-1",
  name: "First completed order",
  description: "Future manual review rule",
  trigger: ReferralRewardTrigger.FIRST_COMPLETED_ORDER,
  rewardType: ReferralRewardType.MANUAL_REVIEW,
  referrerRewardValue: new Prisma.Decimal(1000),
  referredCustomerRewardValue: new Prisma.Decimal(0),
  minimumTransactionAmount: new Prisma.Decimal(2500),
  requiredValidTransactions: 1,
  currency: "NGN",
  isActive: false,
  startsAt: null,
  endsAt: null,
  createdByAdminId: "admin-1",
  createdAt: now,
  updatedAt: now,
  createdByAdmin: { id: "admin-1", fullName: "Marketing Admin", email: "admin@karigo.local", adminRole: "MARKETING_MANAGER" }
};

describe("ReferralsService", () => {
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    customerReferralProfile: {
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn()
    },
    customerReferral: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn()
    },
    customerReferralRewardRule: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new ReferralsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customerProfile.findUnique.mockResolvedValue(customer);
    prisma.customerReferralProfile.count.mockResolvedValue(1);
    prisma.customerReferralProfile.upsert.mockResolvedValue(referralProfile);
    prisma.customerReferral.count.mockResolvedValue(0);
    prisma.customerReferral.findMany.mockResolvedValue([referral]);
    prisma.customerReferral.groupBy.mockResolvedValue([{ status: CustomerReferralStatus.REGISTERED, _count: { _all: 1 } }]);
    prisma.customerReferralRewardRule.count.mockResolvedValue(1);
    prisma.customerReferralRewardRule.findMany.mockResolvedValue([rewardRule]);
    prisma.customerReferralRewardRule.create.mockResolvedValue(rewardRule);
    prisma.customerReferralRewardRule.findUnique.mockResolvedValue({ id: rewardRule.id });
    prisma.customerReferralRewardRule.update.mockResolvedValue({ ...rewardRule, isActive: true });
    prisma.customerReferral.findUnique.mockResolvedValue(null);
    prisma.customerReferral.update.mockResolvedValue(referral);
    prisma.$transaction.mockImplementation((input: unknown) => Array.isArray(input) ? Promise.all(input as Promise<unknown>[]) : input);
    audit.record.mockResolvedValue({});
  });

  it("returns a customer referral profile without enabling fulfillment", async () => {
    prisma.customerReferral.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.customerProfile("user-1");

    expect(prisma.customerReferralProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: customer.id },
      create: { customerId: customer.id, code: customer.referralCode }
    }));
    expect(result.code).toBe(customer.referralCode);
    expect(result.summary.rewardFulfillmentEnabled).toBe(false);
    expect(result.summary.note).toContain("has not enabled automatic wallet credits");
  });

  it("rejects customer referral access when no customer profile exists", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue(null);

    await expect(service.customerProfile("not-customer")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists customer referral history without exposing phone or email", async () => {
    const result = await service.customerReferrals("user-1");

    expect(result[0].referredCustomer).toEqual({
      id: "customer-2",
      fullName: "Referred Customer"
    });
    expect(result[0].referredCustomer).not.toHaveProperty("phoneNumber");
    expect(result[0].referredCustomer).not.toHaveProperty("email");
  });

  it("creates reward rules for future review without issuing rewards", async () => {
    const result = await service.adminCreateRewardRule("admin-1", {
      name: "First completed order",
      trigger: ReferralRewardTrigger.FIRST_COMPLETED_ORDER,
      rewardType: ReferralRewardType.MANUAL_REVIEW,
      referrerRewardValue: 1000,
      minimumTransactionAmount: 2500
    });

    expect(prisma.customerReferralRewardRule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rewardType: ReferralRewardType.MANUAL_REVIEW,
        isActive: false,
        createdByAdminId: "admin-1"
      })
    }));
    expect(result.fulfillmentEnabled).toBe(false);
    expect(audit.record).toHaveBeenCalledWith("admin-1", "referral.reward_rule.created", "CustomerReferralRewardRule", rewardRule.id, expect.objectContaining({
      fulfillmentEnabled: false
    }));
  });

  it("rejects reward rules with invalid date windows", async () => {
    await expect(service.adminCreateRewardRule("admin-1", {
      name: "Bad dates",
      trigger: ReferralRewardTrigger.FIRST_COMPLETED_ORDER,
      rewardType: ReferralRewardType.MANUAL_REVIEW,
      referrerRewardValue: 0,
      startsAt: "2026-07-13T00:00:00.000Z",
      endsAt: "2026-07-12T00:00:00.000Z"
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns referral detail for admin review without enabling fulfillment", async () => {
    prisma.customerReferral.findUnique.mockResolvedValue(referral);

    const result = await service.adminDetail(referral.id);

    expect(result.id).toBe(referral.id);
    expect(result.fulfillmentEnabled).toBe(false);
    expect(result).toHaveProperty("adminNote");
  });

  it("returns a referral pilot summary with fulfillment channels disabled", async () => {
    prisma.customerReferral.groupBy.mockResolvedValue([
      { status: CustomerReferralStatus.REGISTERED, _count: { _all: 2 } },
      { status: CustomerReferralStatus.ELIGIBLE_FOR_REWARD, _count: { _all: 1 } },
      { status: CustomerReferralStatus.REWARD_APPROVED, _count: { _all: 1 } }
    ]);
    prisma.customerReferralProfile.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prisma.customerReferralRewardRule.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const result = await service.adminSummary();

    expect(result.referrals.total).toBe(4);
    expect(result.rewardReview.queue).toBe(1);
    expect(result.rewardReview.approvedReserved).toBe(1);
    expect(result.rewardReview.automaticRewardFulfillmentEnabled).toBe(false);
    expect(result.rewardReview.fulfillmentChannelsEnabled).toEqual({
      walletCredit: false,
      airtimeData: false,
      promoCode: false,
      freeDelivery: false,
      messaging: false
    });
    expect(result.recentActivity[0]).toEqual(expect.objectContaining({
      referralCode: referral.referralCode,
      referrerName: "Referrer Customer",
      referredCustomerName: "Referred Customer"
    }));
  });

  it("generates a management-ready referral report without issuing rewards", async () => {
    const result = await service.adminReport();

    expect(result.title).toBe("KariGO Referral Pilot Report");
    expect(result.format).toBe("markdown");
    expect(result.fulfillmentEnabled).toBe(false);
    expect(result.markdown).toContain("# KariGO Referral Pilot Report");
    expect(result.markdown).toContain("Wallet credit posting: Off");
    expect(result.markdown).toContain("Airtime/data fulfilment: Off");
    expect(result.markdown).toContain("No customer-facing reward promise should be made");
    expect(prisma.customerReferral.update).not.toHaveBeenCalled();
  });

  it("records a manual reward approval without issuing any reward", async () => {
    const reviewedReferral = {
      ...referral,
      status: CustomerReferralStatus.REWARD_APPROVED,
      rewardRuleId: rewardRule.id,
      rewardRule,
      eligibleAt: now,
      rewardReviewedAt: now,
      adminNote: "Approved for future manual fulfilment after pilot signoff."
    };
    prisma.customerReferral.findUnique.mockResolvedValue({ id: referral.id, eligibleAt: null, adminNote: null });
    prisma.customerReferral.update.mockResolvedValue(reviewedReferral);

    const result = await service.adminReview("admin-1", referral.id, {
      status: CustomerReferralStatus.REWARD_APPROVED,
      rewardRuleId: rewardRule.id,
      adminNote: "Approved for future manual fulfilment after pilot signoff."
    });

    expect(prisma.customerReferralRewardRule.findUnique).toHaveBeenCalledWith({ where: { id: rewardRule.id }, select: { id: true } });
    expect(prisma.customerReferral.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: referral.id },
      data: expect.objectContaining({
        status: CustomerReferralStatus.REWARD_APPROVED,
        eligibleAt: expect.any(Date),
        rewardReviewedAt: expect.any(Date),
        rewardRuleId: rewardRule.id,
        adminNote: "Approved for future manual fulfilment after pilot signoff."
      })
    }));
    expect(result.status).toBe(CustomerReferralStatus.REWARD_APPROVED);
    expect(result.fulfillmentEnabled).toBe(false);
    expect(audit.record).toHaveBeenCalledWith("admin-1", "referral.reward_review.updated", "CustomerReferral", referral.id, expect.objectContaining({
      rewardReservedForFutureFulfillment: true,
      fulfillmentEnabled: false
    }));
  });

  it("rejects reward issued status because fulfillment is not active", async () => {
    await expect(service.adminReview("admin-1", referral.id, {
      status: CustomerReferralStatus.REWARD_ISSUED,
      adminNote: "Do not issue automatically"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.customerReferral.update).not.toHaveBeenCalled();
  });

  it("marks referred customer activation without issuing a reward", async () => {
    prisma.customerReferral.findUnique.mockResolvedValue({
      id: referral.id,
      status: CustomerReferralStatus.REGISTERED,
      referrerProfileId: referralProfile.id
    });
    prisma.customerReferral.update.mockResolvedValue({ ...referral, status: CustomerReferralStatus.ACCOUNT_ACTIVATED });
    prisma.customerReferralProfile.update.mockResolvedValue({ ...referralProfile, activatedReferrals: 1 });

    await service.markReferredCustomerActivated("customer-2");

    expect(prisma.customerReferral.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: CustomerReferralStatus.ACCOUNT_ACTIVATED,
        accountActivatedAt: expect.any(Date)
      })
    }));
    expect(prisma.customerReferralProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { activatedReferrals: { increment: 1 } }
    }));
  });
});
