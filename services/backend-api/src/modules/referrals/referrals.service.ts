import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CustomerReferralProfileStatus,
  CustomerReferralStatus,
  Prisma,
  ReferralRewardTrigger,
  ReferralRewardType
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateReferralRewardRuleDto } from "./dto/create-referral-reward-rule.dto";
import { ListReferralsQueryDto } from "./dto/list-referrals-query.dto";
import { ListRewardRulesQueryDto } from "./dto/list-reward-rules-query.dto";
import { ReviewReferralDto } from "./dto/review-referral.dto";
import { UpdateReferralRewardRuleDto } from "./dto/update-referral-reward-rule.dto";

const REVIEW_STATUSES = new Set<CustomerReferralStatus>([
  CustomerReferralStatus.ELIGIBLE_FOR_REWARD,
  CustomerReferralStatus.REWARD_REVIEW_PENDING,
  CustomerReferralStatus.REWARD_APPROVED,
  CustomerReferralStatus.INELIGIBLE,
  CustomerReferralStatus.CANCELLED
]);
const ELIGIBLE_REVIEW_STATUSES = new Set<CustomerReferralStatus>([
  CustomerReferralStatus.ELIGIBLE_FOR_REWARD,
  CustomerReferralStatus.REWARD_REVIEW_PENDING,
  CustomerReferralStatus.REWARD_APPROVED
]);

const USER_PUBLIC_SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  email: true
} satisfies Prisma.UserSelect;

const REFERRAL_INCLUDE = {
  referrerProfile: { select: { id: true, code: true, status: true, shareEnabled: true } },
  referrerCustomer: { select: { id: true, user: { select: USER_PUBLIC_SELECT } } },
  referredCustomer: { select: { id: true, user: { select: USER_PUBLIC_SELECT } } },
  rewardRule: {
    select: {
      id: true,
      name: true,
      trigger: true,
      rewardType: true,
      isActive: true
    }
  }
} satisfies Prisma.CustomerReferralInclude;

const RULE_INCLUDE = {
  createdByAdmin: { select: { id: true, fullName: true, email: true, adminRole: true } }
} satisfies Prisma.CustomerReferralRewardRuleInclude;

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  async customerProfile(userId: string) {
    const customer = await this.requireCustomer(userId);
    const profile = await this.ensureReferralProfile(customer.id, customer.referralCode);
    const [referrals, activated, eligible] = await Promise.all([
      this.prisma.customerReferral.count({ where: { referrerProfileId: profile.id } }),
      this.prisma.customerReferral.count({
        where: {
          referrerProfileId: profile.id,
          status: { in: [
            CustomerReferralStatus.ACCOUNT_ACTIVATED,
            CustomerReferralStatus.FIRST_VALID_TRANSACTION_COMPLETED,
            CustomerReferralStatus.ELIGIBLE_FOR_REWARD,
            CustomerReferralStatus.REWARD_REVIEW_PENDING,
            CustomerReferralStatus.REWARD_APPROVED,
            CustomerReferralStatus.REWARD_ISSUED
          ] }
        }
      }),
      this.prisma.customerReferral.count({
        where: {
          referrerProfileId: profile.id,
          status: { in: [
            CustomerReferralStatus.ELIGIBLE_FOR_REWARD,
            CustomerReferralStatus.REWARD_REVIEW_PENDING,
            CustomerReferralStatus.REWARD_APPROVED,
            CustomerReferralStatus.REWARD_ISSUED
          ] }
        }
      })
    ]);

    return {
      ...this.toCustomerReferralProfile(profile),
      summary: {
        totalReferrals: referrals,
        activatedReferrals: activated,
        eligibleReferrals: eligible,
        rewardFulfillmentEnabled: false,
        note: "Referral rewards are tracked for future review only. KariGO has not enabled automatic wallet credits, airtime, data, promo issuing or messaging."
      }
    };
  }

  async customerReferrals(userId: string) {
    const customer = await this.requireCustomer(userId);
    const profile = await this.ensureReferralProfile(customer.id, customer.referralCode);
    const referrals = await this.prisma.customerReferral.findMany({
      where: { referrerProfileId: profile.id },
      include: REFERRAL_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return referrals.map((referral) => ({
      id: referral.id,
      referralCode: referral.referralCode,
      status: referral.status,
      referredCustomer: {
        id: referral.referredCustomer.id,
        fullName: referral.referredCustomer.user.fullName
      },
      accountActivatedAt: referral.accountActivatedAt?.toISOString() ?? null,
      firstValidTransactionAt: referral.firstValidTransactionAt?.toISOString() ?? null,
      eligibleAt: referral.eligibleAt?.toISOString() ?? null,
      rewardIssuedAt: referral.rewardIssuedAt?.toISOString() ?? null,
      createdAt: referral.createdAt.toISOString(),
      updatedAt: referral.updatedAt.toISOString()
    }));
  }

  async adminList(query: ListReferralsQueryDto) {
    const where: Prisma.CustomerReferralWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.referrerCustomerId ? { referrerCustomerId: query.referrerCustomerId } : {}),
      ...(query.referredCustomerId ? { referredCustomerId: query.referredCustomerId } : {}),
      ...(query.search ? {
        OR: [
          { referralCode: { contains: query.search, mode: "insensitive" } },
          { referrerCustomer: { user: { fullName: { contains: query.search, mode: "insensitive" } } } },
          { referrerCustomer: { user: { phoneNumber: { contains: query.search } } } },
          { referredCustomer: { user: { fullName: { contains: query.search, mode: "insensitive" } } } },
          { referredCustomer: { user: { phoneNumber: { contains: query.search } } } }
        ]
      } : {})
    };

    const [items, total, registered, activated, eligible, reviewPending, rewardApproved, issued] = await Promise.all([
      this.prisma.customerReferral.findMany({
        where,
        include: REFERRAL_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      this.prisma.customerReferral.count({ where }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.REGISTERED } }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.ACCOUNT_ACTIVATED } }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.ELIGIBLE_FOR_REWARD } }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.REWARD_REVIEW_PENDING } }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.REWARD_APPROVED } }),
      this.prisma.customerReferral.count({ where: { status: CustomerReferralStatus.REWARD_ISSUED } })
    ]);

    return {
      summary: {
        total,
        registered,
        accountActivated: activated,
        eligibleForReward: eligible,
        rewardReviewPending: reviewPending,
        rewardApproved,
        rewardsIssued: issued,
        automaticRewardFulfillmentEnabled: false
      },
      items: items.map((referral) => this.toAdminReferral(referral))
    };
  }

  async adminSummary() {
    const [
      statusRows,
      totalProfiles,
      activeProfiles,
      shareEnabledProfiles,
      totalRules,
      activeRules,
      manualReviewRules,
      recentReferrals
    ] = await Promise.all([
      this.prisma.customerReferral.groupBy({
        by: ["status"],
        _count: { _all: true }
      }),
      this.prisma.customerReferralProfile.count(),
      this.prisma.customerReferralProfile.count({ where: { status: CustomerReferralProfileStatus.ACTIVE } }),
      this.prisma.customerReferralProfile.count({ where: { shareEnabled: true } }),
      this.prisma.customerReferralRewardRule.count(),
      this.prisma.customerReferralRewardRule.count({ where: { isActive: true } }),
      this.prisma.customerReferralRewardRule.count({ where: { rewardType: ReferralRewardType.MANUAL_REVIEW } }),
      this.prisma.customerReferral.findMany({
        include: REFERRAL_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 5
      })
    ]);

    const byStatus = this.emptyReferralStatusCounts();
    statusRows.forEach((row) => { byStatus[row.status] = row._count._all; });
    const totalReferrals = Object.values(byStatus).reduce((total, count) => total + count, 0);
    const activatedReferrals = [
      CustomerReferralStatus.ACCOUNT_ACTIVATED,
      CustomerReferralStatus.FIRST_VALID_TRANSACTION_COMPLETED,
      CustomerReferralStatus.ELIGIBLE_FOR_REWARD,
      CustomerReferralStatus.REWARD_REVIEW_PENDING,
      CustomerReferralStatus.REWARD_APPROVED,
      CustomerReferralStatus.REWARD_ISSUED
    ].reduce((total, status) => total + byStatus[status], 0);
    const reviewQueue = byStatus[CustomerReferralStatus.ELIGIBLE_FOR_REWARD] + byStatus[CustomerReferralStatus.REWARD_REVIEW_PENDING];
    const approvedReserved = byStatus[CustomerReferralStatus.REWARD_APPROVED];
    const conversionRate = totalReferrals === 0 ? 0 : Number(((activatedReferrals / totalReferrals) * 100).toFixed(1));

    return {
      generatedAt: new Date().toISOString(),
      profiles: {
        total: totalProfiles,
        active: activeProfiles,
        shareEnabled: shareEnabledProfiles
      },
      referrals: {
        total: totalReferrals,
        registered: byStatus[CustomerReferralStatus.REGISTERED],
        accountActivated: byStatus[CustomerReferralStatus.ACCOUNT_ACTIVATED],
        firstValidTransactionCompleted: byStatus[CustomerReferralStatus.FIRST_VALID_TRANSACTION_COMPLETED],
        eligibleForReward: byStatus[CustomerReferralStatus.ELIGIBLE_FOR_REWARD],
        rewardReviewPending: byStatus[CustomerReferralStatus.REWARD_REVIEW_PENDING],
        rewardApproved: approvedReserved,
        rewardIssued: byStatus[CustomerReferralStatus.REWARD_ISSUED],
        ineligible: byStatus[CustomerReferralStatus.INELIGIBLE],
        cancelled: byStatus[CustomerReferralStatus.CANCELLED],
        byStatus,
        activatedReferrals,
        conversionRate
      },
      rewardReview: {
        queue: reviewQueue,
        approvedReserved,
        issuedBlocked: byStatus[CustomerReferralStatus.REWARD_ISSUED],
        automaticRewardFulfillmentEnabled: false,
        fulfillmentChannelsEnabled: {
          walletCredit: false,
          airtimeData: false,
          promoCode: false,
          freeDelivery: false,
          messaging: false
        },
        note: "Referral rewards are review-only. Approved rewards are reserved for future fulfilment and no wallet credit, airtime/data, promo, free delivery or notification is issued."
      },
      rewardRules: {
        total: totalRules,
        active: activeRules,
        manualReview: manualReviewRules
      },
      recentActivity: recentReferrals.map((referral) => ({
        id: referral.id,
        referralCode: referral.referralCode,
        status: referral.status,
        referrerName: referral.referrerCustomer.user.fullName,
        referredCustomerName: referral.referredCustomer.user.fullName,
        rewardRuleName: referral.rewardRule?.name ?? null,
        rewardReviewedAt: referral.rewardReviewedAt?.toISOString() ?? null,
        updatedAt: referral.updatedAt.toISOString()
      }))
    };
  }

  async adminReport() {
    const summary = await this.adminSummary();
    const markdown = [
      "# KariGO Referral Pilot Report",
      "",
      `Generated: ${summary.generatedAt}`,
      "",
      "## Executive Summary",
      `- Total referral profiles: ${summary.profiles.total}`,
      `- Share-enabled referral profiles: ${summary.profiles.shareEnabled}`,
      `- Total referral records: ${summary.referrals.total}`,
      `- Activated referrals: ${summary.referrals.activatedReferrals}`,
      `- Activation conversion rate: ${summary.referrals.conversionRate}%`,
      `- Pending manual reward review: ${summary.rewardReview.queue}`,
      `- Approved/reserved for future fulfilment: ${summary.rewardReview.approvedReserved}`,
      "",
      "## Referral Status Breakdown",
      ...Object.entries(summary.referrals.byStatus).map(([status, count]) => `- ${this.humanize(status)}: ${count}`),
      "",
      "## Reward Rule Readiness",
      `- Reward rules configured: ${summary.rewardRules.total}`,
      `- Active reward rules: ${summary.rewardRules.active}`,
      `- Manual-review reward rules: ${summary.rewardRules.manualReview}`,
      "",
      "## Safety And Fulfilment Guardrails",
      "- Automatic reward fulfilment: Off",
      "- Wallet credit posting: Off",
      "- Airtime/data fulfilment: Off",
      "- Promo code issuing: Off",
      "- Free delivery reward creation: Off",
      "- SMS/email/WhatsApp/push notifications: Off",
      "",
      "## Recent Referral Activity",
      ...(summary.recentActivity.length
        ? summary.recentActivity.map((item) => `- ${item.referralCode}: ${this.humanize(item.status)} (${item.referrerName} referred ${item.referredCustomerName})`)
        : ["- No referral activity recorded yet."]),
      "",
      "## Management Notes",
      "- Referral approvals recorded in KariGO are reservations only until management approves a fulfilment process.",
      "- Finance and operations should reconcile approved referrals before any future manual reward fulfilment.",
      "- No customer-facing reward promise should be made until fulfilment channels are approved."
    ].join("\n");

    return {
      generatedAt: summary.generatedAt,
      title: "KariGO Referral Pilot Report",
      format: "markdown",
      markdown,
      summary,
      fulfillmentEnabled: false
    };
  }

  async adminDetail(referralId: string) {
    const referral = await this.prisma.customerReferral.findUnique({
      where: { id: referralId },
      include: REFERRAL_INCLUDE
    });
    if (!referral) throw new NotFoundException("Referral record not found");
    return this.toAdminReferral(referral);
  }

  async adminReview(adminUserId: string, referralId: string, dto: ReviewReferralDto) {
    if (!REVIEW_STATUSES.has(dto.status)) {
      throw new BadRequestException("Referral review can only mark records eligible, pending review, approved, ineligible or cancelled");
    }

    const existing = await this.prisma.customerReferral.findUnique({
      where: { id: referralId },
      select: { id: true, eligibleAt: true, adminNote: true }
    });
    if (!existing) throw new NotFoundException("Referral record not found");

    if (dto.rewardRuleId) {
      const rule = await this.prisma.customerReferralRewardRule.findUnique({ where: { id: dto.rewardRuleId }, select: { id: true } });
      if (!rule) throw new BadRequestException("Referral reward rule not found");
    }

    const now = new Date();
    const shouldStampEligible = ELIGIBLE_REVIEW_STATUSES.has(dto.status) && !existing.eligibleAt;

    const referral = await this.prisma.customerReferral.update({
      where: { id: referralId },
      data: {
        status: dto.status,
        ...(shouldStampEligible ? { eligibleAt: now } : {}),
        rewardReviewedAt: now,
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote?.trim() || null } : {}),
        ...(dto.rewardRuleId !== undefined ? { rewardRuleId: dto.rewardRuleId || null } : {})
      },
      include: REFERRAL_INCLUDE
    });

    await this.audit.record(adminUserId, "referral.reward_review.updated", "CustomerReferral", referral.id, {
      status: referral.status,
      rewardRuleId: referral.rewardRuleId,
      rewardReservedForFutureFulfillment: referral.status === CustomerReferralStatus.REWARD_APPROVED,
      fulfillmentEnabled: false
    });

    return this.toAdminReferral(referral);
  }

  async adminRewardRules(query: ListRewardRulesQueryDto) {
    const rules = await this.prisma.customerReferralRewardRule.findMany({
      where: {
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.trigger ? { trigger: query.trigger } : {}),
        ...(query.rewardType ? { rewardType: query.rewardType } : {})
      },
      include: RULE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return rules.map((rule) => this.toRewardRule(rule));
  }

  async adminCreateRewardRule(adminUserId: string, dto: CreateReferralRewardRuleDto) {
    this.validateRuleDates(dto.startsAt, dto.endsAt);
    const rule = await this.prisma.customerReferralRewardRule.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        trigger: dto.trigger,
        rewardType: dto.rewardType,
        referrerRewardValue: this.toDecimal(dto.referrerRewardValue),
        referredCustomerRewardValue: this.toDecimal(dto.referredCustomerRewardValue ?? 0),
        minimumTransactionAmount: dto.minimumTransactionAmount === undefined ? null : this.toDecimal(dto.minimumTransactionAmount),
        requiredValidTransactions: dto.requiredValidTransactions ?? 1,
        currency: (dto.currency ?? "NGN").trim().toUpperCase(),
        isActive: dto.isActive ?? false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdByAdminId: adminUserId
      },
      include: RULE_INCLUDE
    });

    await this.audit.record(adminUserId, "referral.reward_rule.created", "CustomerReferralRewardRule", rule.id, {
      rewardType: rule.rewardType,
      trigger: rule.trigger,
      isActive: rule.isActive,
      fulfillmentEnabled: false
    });

    return this.toRewardRule(rule);
  }

  async adminUpdateRewardRule(adminUserId: string, ruleId: string, dto: UpdateReferralRewardRuleDto) {
    this.validateRuleDates(dto.startsAt, dto.endsAt);
    const existing = await this.prisma.customerReferralRewardRule.findUnique({ where: { id: ruleId }, select: { id: true } });
    if (!existing) throw new NotFoundException("Referral reward rule not found");

    const rule = await this.prisma.customerReferralRewardRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.rewardType !== undefined ? { rewardType: dto.rewardType } : {}),
        ...(dto.referrerRewardValue !== undefined ? { referrerRewardValue: this.toDecimal(dto.referrerRewardValue) } : {}),
        ...(dto.referredCustomerRewardValue !== undefined ? { referredCustomerRewardValue: this.toDecimal(dto.referredCustomerRewardValue) } : {}),
        ...(dto.minimumTransactionAmount !== undefined ? { minimumTransactionAmount: this.toDecimal(dto.minimumTransactionAmount) } : {}),
        ...(dto.requiredValidTransactions !== undefined ? { requiredValidTransactions: dto.requiredValidTransactions } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.trim().toUpperCase() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {})
      },
      include: RULE_INCLUDE
    });

    await this.audit.record(adminUserId, "referral.reward_rule.updated", "CustomerReferralRewardRule", rule.id, {
      rewardType: rule.rewardType,
      trigger: rule.trigger,
      isActive: rule.isActive,
      fulfillmentEnabled: false
    });

    return this.toRewardRule(rule);
  }

  async markReferredCustomerActivated(customerId: string) {
    const referral = await this.prisma.customerReferral.findUnique({
      where: { referredCustomerId: customerId },
      select: { id: true, status: true, referrerProfileId: true }
    });
    if (!referral || referral.status !== CustomerReferralStatus.REGISTERED) return;

    await this.prisma.$transaction([
      this.prisma.customerReferral.update({
        where: { id: referral.id },
        data: {
          status: CustomerReferralStatus.ACCOUNT_ACTIVATED,
          accountActivatedAt: new Date()
        }
      }),
      this.prisma.customerReferralProfile.update({
        where: { id: referral.referrerProfileId },
        data: { activatedReferrals: { increment: 1 } }
      })
    ]);
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true, referralCode: true }
    });
    if (!customer) throw new NotFoundException("Customer profile not found");
    return customer;
  }

  private ensureReferralProfile(customerId: string, code: string) {
    return this.prisma.customerReferralProfile.upsert({
      where: { customerId },
      update: {},
      create: { customerId, code }
    });
  }

  private validateRuleDates(startsAt?: string, endsAt?: string) {
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new BadRequestException("Referral reward rule end date must be after start date");
    }
  }

  private toDecimal(value: number) {
    const decimal = new Prisma.Decimal(value).toDecimalPlaces(2);
    if (decimal.lessThan(0)) throw new BadRequestException("Referral reward amounts cannot be negative");
    return decimal;
  }

  private toCustomerReferralProfile(profile: Prisma.CustomerReferralProfileGetPayload<object>) {
    return {
      id: profile.id,
      code: profile.code,
      status: profile.status,
      shareEnabled: profile.shareEnabled,
      totalReferrals: profile.totalReferrals,
      activatedReferrals: profile.activatedReferrals,
      eligibleReferrals: profile.eligibleReferrals,
      lastReferralAt: profile.lastReferralAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  private emptyReferralStatusCounts() {
    return Object.values(CustomerReferralStatus).reduce((counts, status) => {
      counts[status] = 0;
      return counts;
    }, {} as Record<CustomerReferralStatus, number>);
  }

  private humanize(value: string) {
    return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private toAdminReferral(referral: Prisma.CustomerReferralGetPayload<{ include: typeof REFERRAL_INCLUDE }>) {
    return {
      id: referral.id,
      referralCode: referral.referralCode,
      status: referral.status,
      referrerProfile: referral.referrerProfile,
      referrerCustomer: referral.referrerCustomer,
      referredCustomer: referral.referredCustomer,
      rewardRule: referral.rewardRule,
      accountActivatedAt: referral.accountActivatedAt?.toISOString() ?? null,
      firstValidTransactionAt: referral.firstValidTransactionAt?.toISOString() ?? null,
      eligibleAt: referral.eligibleAt?.toISOString() ?? null,
      rewardReviewedAt: referral.rewardReviewedAt?.toISOString() ?? null,
      rewardIssuedAt: referral.rewardIssuedAt?.toISOString() ?? null,
      adminNote: referral.adminNote,
      createdAt: referral.createdAt.toISOString(),
      updatedAt: referral.updatedAt.toISOString(),
      fulfillmentEnabled: false
    };
  }

  private toRewardRule(rule: Prisma.CustomerReferralRewardRuleGetPayload<{ include: typeof RULE_INCLUDE }>) {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger as ReferralRewardTrigger,
      rewardType: rule.rewardType as ReferralRewardType,
      referrerRewardValue: rule.referrerRewardValue,
      referredCustomerRewardValue: rule.referredCustomerRewardValue,
      minimumTransactionAmount: rule.minimumTransactionAmount,
      requiredValidTransactions: rule.requiredValidTransactions,
      currency: rule.currency,
      isActive: rule.isActive,
      startsAt: rule.startsAt?.toISOString() ?? null,
      endsAt: rule.endsAt?.toISOString() ?? null,
      createdByAdmin: rule.createdByAdmin,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      fulfillmentEnabled: false
    };
  }
}
