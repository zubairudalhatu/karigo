import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AdCampaignStatus,
  AdPlacementSurface,
  AdSponsorType,
  Prisma,
  VendorAdCreditLedgerDirection,
  VendorAdCreditLedgerEntryType,
  VendorStatus
} from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAdCampaignDto } from "./dto/create-ad-campaign.dto";
import { CreateAdCreditAdjustmentDto } from "./dto/create-ad-credit-adjustment.dto";
import { UpdateAdCampaignDto } from "./dto/update-ad-campaign.dto";

const AD_INCLUDE = {
  vendor: { select: { id: true, businessName: true, logoUrl: true, city: true, state: true } }
} satisfies Prisma.AdCampaignInclude;

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  async customerHome() {
    const now = new Date();
    const items = await this.prisma.adCampaign.findMany({
      where: {
        placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED,
        status: AdCampaignStatus.ACTIVE,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
      },
      include: AD_INCLUDE,
      orderBy: { updatedAt: "desc" },
      take: 3
    });

    return {
      items: items.map((campaign) => this.publicAd(campaign)),
      guardrails: {
        adsAreLabelled: true,
        liveBillingEnabled: false,
        walletTopUpEnabled: false,
        checkoutPricingAffected: false
      }
    };
  }

  async vendorDashboard(userId: string) {
    const vendor = await this.requireVendor(userId);
    const [account, campaigns] = await Promise.all([
      this.ensureAdCreditAccount(vendor.id),
      this.prisma.adCampaign.findMany({
        where: { vendorId: vendor.id },
        include: AD_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 100
      })
    ]);

    return {
      creditAccount: this.creditAccount(account),
      campaigns: campaigns.map((campaign) => this.vendorAd(campaign)),
      guardrails: this.adGuardrails()
    };
  }

  async vendorCreate(userId: string, dto: CreateAdCampaignDto) {
    const vendor = await this.requireVendor(userId);
    await this.ensureAdCreditAccount(vendor.id);
    const campaign = await this.prisma.adCampaign.create({
      data: {
        campaignReference: await this.uniqueCampaignReference(),
        sponsorType: AdSponsorType.VENDOR,
        vendorId: vendor.id,
        placementSurface: dto.placementSurface ?? AdPlacementSurface.CUSTOMER_HOME_FEATURED,
        title: dto.title.trim(),
        body: dto.body.trim(),
        imageUrl: this.optionalText(dto.imageUrl),
        ctaLabel: this.optionalText(dto.ctaLabel),
        ctaUrl: this.optionalText(dto.ctaUrl),
        requestedBudgetKobo: dto.requestedBudgetKobo ?? 0,
        status: AdCampaignStatus.SUBMITTED,
        startsAt: this.optionalDate(dto.startsAt),
        endsAt: this.optionalDate(dto.endsAt)
      },
      include: AD_INCLUDE
    });

    return this.vendorAd(campaign);
  }

  async adminList() {
    const [items, submitted, underReview, approved, active, rejected] = await Promise.all([
      this.prisma.adCampaign.findMany({ include: AD_INCLUDE, orderBy: { createdAt: "desc" }, take: 200 }),
      this.prisma.adCampaign.count({ where: { status: AdCampaignStatus.SUBMITTED } }),
      this.prisma.adCampaign.count({ where: { status: AdCampaignStatus.UNDER_REVIEW } }),
      this.prisma.adCampaign.count({ where: { status: AdCampaignStatus.APPROVED } }),
      this.prisma.adCampaign.count({ where: { status: AdCampaignStatus.ACTIVE } }),
      this.prisma.adCampaign.count({ where: { status: AdCampaignStatus.REJECTED } })
    ]);
    return {
      summary: { total: items.length, submitted, underReview, approved, active, rejected },
      items: items.map((campaign) => this.adminAd(campaign)),
      guardrails: this.adGuardrails()
    };
  }

  async adminCreate(adminUserId: string, dto: CreateAdCampaignDto) {
    const sponsorType = dto.sponsorType ?? (dto.vendorId ? AdSponsorType.VENDOR : AdSponsorType.EXTERNAL);
    if (sponsorType === AdSponsorType.VENDOR && !dto.vendorId) {
      throw new BadRequestException("Vendor-sponsored ads require a vendorId.");
    }
    if (sponsorType === AdSponsorType.EXTERNAL && !dto.advertiserName?.trim()) {
      throw new BadRequestException("External advertiser ads require an advertiser name.");
    }
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, status: VendorStatus.ACTIVE, deletedAt: null }, select: { id: true } });
      if (!vendor) throw new NotFoundException("Active vendor not found for ad campaign.");
    }

    const campaign = await this.prisma.adCampaign.create({
      data: {
        campaignReference: await this.uniqueCampaignReference(),
        sponsorType,
        vendorId: dto.vendorId,
        placementSurface: dto.placementSurface ?? AdPlacementSurface.CUSTOMER_HOME_FEATURED,
        title: dto.title.trim(),
        body: dto.body.trim(),
        imageUrl: this.optionalText(dto.imageUrl),
        ctaLabel: this.optionalText(dto.ctaLabel),
        ctaUrl: this.optionalText(dto.ctaUrl),
        advertiserName: this.optionalText(dto.advertiserName),
        advertiserContactName: this.optionalText(dto.advertiserContactName),
        advertiserEmail: this.optionalText(dto.advertiserEmail),
        advertiserPhone: this.optionalText(dto.advertiserPhone),
        requestedBudgetKobo: dto.requestedBudgetKobo ?? 0,
        status: dto.status ?? AdCampaignStatus.APPROVED,
        startsAt: this.optionalDate(dto.startsAt),
        endsAt: this.optionalDate(dto.endsAt),
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date()
      },
      include: AD_INCLUDE
    });

    await this.audit.record(adminUserId, "ad_campaign.created", "AdCampaign", campaign.id, {
      campaignReference: campaign.campaignReference,
      sponsorType: campaign.sponsorType,
      status: campaign.status
    });
    return this.adminAd(campaign);
  }

  async adminUpdate(adminUserId: string, campaignId: string, dto: UpdateAdCampaignDto) {
    const existing = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!existing) throw new NotFoundException("Ad campaign not found");

    const releaseStatuses: AdCampaignStatus[] = [AdCampaignStatus.REJECTED, AdCampaignStatus.CANCELLED, AdCampaignStatus.EXPIRED];
    const nextReservedCreditKobo = dto.status && releaseStatuses.includes(dto.status) ? 0 : dto.reservedCreditKobo;
    if (existing.vendorId && nextReservedCreditKobo !== undefined) {
      await this.setReservation(adminUserId, existing.vendorId, existing.id, nextReservedCreditKobo, existing.reservedCreditKobo);
    }

    const campaign = await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
        ...(dto.body === undefined ? {} : { body: dto.body.trim() }),
        ...(dto.imageUrl === undefined ? {} : { imageUrl: this.optionalText(dto.imageUrl) }),
        ...(dto.ctaLabel === undefined ? {} : { ctaLabel: this.optionalText(dto.ctaLabel) }),
        ...(dto.ctaUrl === undefined ? {} : { ctaUrl: this.optionalText(dto.ctaUrl) }),
        ...(dto.requestedBudgetKobo === undefined ? {} : { requestedBudgetKobo: dto.requestedBudgetKobo }),
        ...(nextReservedCreditKobo === undefined ? {} : { reservedCreditKobo: nextReservedCreditKobo }),
        ...(dto.status === undefined ? {} : { status: dto.status, reviewedByAdminId: adminUserId, reviewedAt: new Date() }),
        ...(dto.startsAt === undefined ? {} : { startsAt: this.optionalDate(dto.startsAt) }),
        ...(dto.endsAt === undefined ? {} : { endsAt: this.optionalDate(dto.endsAt) }),
        ...(dto.adminNote === undefined ? {} : { adminNote: this.optionalText(dto.adminNote) }),
        ...(dto.rejectionReason === undefined ? {} : { rejectionReason: this.optionalText(dto.rejectionReason) })
      },
      include: AD_INCLUDE
    });

    await this.audit.record(adminUserId, "ad_campaign.updated", "AdCampaign", campaign.id, {
      campaignReference: campaign.campaignReference,
      previousStatus: existing.status,
      status: campaign.status,
      reservedCreditKobo: campaign.reservedCreditKobo
    });
    return this.adminAd(campaign);
  }

  async adminGrantVendorCredit(adminUserId: string, vendorId: string, dto: CreateAdCreditAdjustmentDto) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null }, select: { id: true } });
    if (!vendor) throw new NotFoundException("Vendor not found");
    const account = await this.ensureAdCreditAccount(vendorId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vendorAdCreditAccount.update({
        where: { vendorId },
        data: {
          balanceKobo: { increment: dto.amountKobo },
          lifetimeGrantedKobo: { increment: dto.amountKobo }
        }
      });
      await tx.vendorAdCreditLedgerEntry.create({
        data: {
          accountId: account.id,
          vendorId,
          entryType: VendorAdCreditLedgerEntryType.ADMIN_GRANT,
          direction: VendorAdCreditLedgerDirection.CREDIT,
          amountKobo: dto.amountKobo,
          balanceBeforeKobo: account.balanceKobo,
          balanceAfterKobo: account.balanceKobo + dto.amountKobo,
          reference: this.creditReference("GRANT"),
          description: this.optionalText(dto.description) ?? "Admin ad credit grant",
          createdByAdminId: adminUserId
        }
      });
      return next;
    });
    await this.audit.record(adminUserId, "vendor_ad_credit.granted", "Vendor", vendorId, { amountKobo: dto.amountKobo });
    return this.creditAccount(updated);
  }

  private async requireVendor(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, businessName: true }
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return vendor;
  }

  private async ensureAdCreditAccount(vendorId: string) {
    return this.prisma.vendorAdCreditAccount.upsert({
      where: { vendorId },
      update: {},
      create: { vendorId }
    });
  }

  private async setReservation(adminUserId: string, vendorId: string, campaignId: string, nextReservedKobo: number, currentReservedKobo: number) {
    if (nextReservedKobo === currentReservedKobo) return;
    const account = await this.ensureAdCreditAccount(vendorId);
    const delta = nextReservedKobo - currentReservedKobo;
    const available = account.balanceKobo - account.reservedKobo;
    if (delta > 0 && delta > available) {
      throw new BadRequestException("Vendor does not have enough controlled ad credit for this reservation.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.vendorAdCreditAccount.update({
        where: { vendorId },
        data: { reservedKobo: { increment: delta } }
      });
      await tx.vendorAdCreditLedgerEntry.create({
        data: {
          accountId: account.id,
          vendorId,
          campaignId,
          entryType: delta > 0 ? VendorAdCreditLedgerEntryType.AD_CAMPAIGN_RESERVATION : VendorAdCreditLedgerEntryType.AD_CAMPAIGN_RELEASE,
          direction: delta > 0 ? VendorAdCreditLedgerDirection.DEBIT : VendorAdCreditLedgerDirection.CREDIT,
          amountKobo: Math.abs(delta),
          balanceBeforeKobo: account.balanceKobo,
          balanceAfterKobo: account.balanceKobo,
          reference: this.creditReference(delta > 0 ? "RESERVE" : "RELEASE"),
          description: delta > 0 ? "Ad campaign credit reserved by admin" : "Ad campaign credit released by admin",
          createdByAdminId: adminUserId
        }
      });
    });
  }

  private publicAd(campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>) {
    return {
      id: campaign.id,
      campaignReference: campaign.campaignReference,
      placementSurface: campaign.placementSurface,
      title: campaign.title,
      body: campaign.body,
      imageUrl: campaign.imageUrl,
      ctaLabel: campaign.ctaLabel,
      ctaUrl: campaign.ctaUrl,
      sponsorType: campaign.sponsorType,
      sponsorName: campaign.vendor?.businessName ?? campaign.advertiserName ?? "KariGO partner",
      label: "Ad"
    };
  }

  private vendorAd(campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>) {
    return {
      ...this.publicAd(campaign),
      requestedBudgetKobo: campaign.requestedBudgetKobo,
      reservedCreditKobo: campaign.reservedCreditKobo,
      status: campaign.status,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      adminNote: campaign.adminNote,
      rejectionReason: campaign.rejectionReason,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }

  private adminAd(campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>) {
    return {
      ...this.vendorAd(campaign),
      vendor: campaign.vendor,
      advertiserName: campaign.advertiserName,
      advertiserContactName: campaign.advertiserContactName,
      advertiserEmail: campaign.advertiserEmail,
      advertiserPhone: campaign.advertiserPhone,
      reviewedByAdminId: campaign.reviewedByAdminId,
      reviewedAt: campaign.reviewedAt,
      submittedAt: campaign.submittedAt
    };
  }

  private creditAccount(account: { balanceKobo: number; reservedKobo: number; lifetimeGrantedKobo: number; lifetimeSpentKobo: number; updatedAt: Date }) {
    return {
      balanceKobo: account.balanceKobo,
      reservedKobo: account.reservedKobo,
      availableKobo: account.balanceKobo - account.reservedKobo,
      lifetimeGrantedKobo: account.lifetimeGrantedKobo,
      lifetimeSpentKobo: account.lifetimeSpentKobo,
      updatedAt: account.updatedAt
    };
  }

  private adGuardrails() {
    return {
      livePaymentsEnabled: false,
      liveWalletTopUpEnabled: false,
      automaticAdBillingEnabled: false,
      adminApprovalRequired: true,
      note: "Ad credits are controlled internal balances only. Real-money ad purchases and wallet top-up remain disabled."
    };
  }

  private optionalText(value?: string | null) {
    const text = value?.trim();
    return text || undefined;
  }

  private optionalDate(value?: string | null) {
    return value ? new Date(value) : undefined;
  }

  private async uniqueCampaignReference() {
    for (let i = 0; i < 5; i += 1) {
      const reference = `KGO-AD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
      const existing = await this.prisma.adCampaign.findUnique({ where: { campaignReference: reference }, select: { id: true } });
      if (!existing) return reference;
    }
    throw new BadRequestException("Could not generate an ad campaign reference. Please try again.");
  }

  private creditReference(label: string) {
    return `KGO-ADC-${label}-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}
