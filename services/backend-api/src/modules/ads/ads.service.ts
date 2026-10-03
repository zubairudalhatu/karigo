import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AdCampaignActorType,
  AdCampaignEventType,
  AdCampaignStatus,
  AdPlacementSurface,
  AdSponsorType,
  Prisma,
  VendorAdCreditLedgerDirection,
  VendorAdCreditLedgerEntryType,
  VendorStatus
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAdCampaignDto } from "./dto/create-ad-campaign.dto";
import { CreateAdCreditAdjustmentDto } from "./dto/create-ad-credit-adjustment.dto";
import { UpdateAdCampaignDto } from "./dto/update-ad-campaign.dto";
import { RecordAdEventDto } from "./dto/record-ad-event.dto";
import { TransitionAdCampaignDto } from "./dto/transition-ad-campaign.dto";
import { assertAdTransition, ctr, normalizeApprovedDestination, REVISION_REQUIRED_STATUSES, validateCampaignPlan } from "./ad-policy";

const AD_INCLUDE = {
  vendor: { select: { id: true, businessName: true, logoUrl: true, city: true, state: true } },
  approvedRevision: { include: { creativeAsset: true } },
  revisions: { orderBy: { revisionNumber: "desc" as const }, take: 20, include: { creativeAsset: true } },
  auditEvents: { orderBy: { createdAt: "desc" as const }, take: 50 }
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
      items: items
        .filter((campaign) => campaign.requestedBudgetKobo === 0 || campaign.spentKobo < campaign.requestedBudgetKobo)
        .map((campaign) => this.publicAd(campaign)),
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

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const grouped = campaignIds.length ? await this.prisma.adCampaignEvent.groupBy({
      by: ["campaignId", "eventType"], where: { campaignId: { in: campaignIds } }, _count: { _all: true }, _sum: { costKobo: true }
    }) : [];
    return {
      creditAccount: this.creditAccount(account),
      campaigns: campaigns.map((campaign) => this.vendorAd(campaign, this.analyticsFor(campaign.id, grouped))),
      guardrails: this.adGuardrails()
    };
  }

  async vendorCreate(userId: string, dto: CreateAdCampaignDto) {
    const vendor = await this.requireVendor(userId);
    await this.ensureAdCreditAccount(vendor.id);
    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    if (!dto.requestedBudgetKobo || dto.requestedBudgetKobo < 1) {
      throw new BadRequestException("Vendor campaigns require a positive controlled-credit budget.");
    }
    validateCampaignPlan({ requestedBudgetKobo: dto.requestedBudgetKobo, dailyBudgetKobo: dto.dailyBudgetKobo, startsAt, endsAt });
    const ctaUrl = normalizeApprovedDestination(dto.ctaUrl);
    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.adCampaign.create({ data: {
        campaignReference: await this.uniqueCampaignReference(),
        sponsorType: AdSponsorType.VENDOR,
        vendorId: vendor.id,
        placementSurface: dto.placementSurface ?? AdPlacementSurface.CUSTOMER_HOME_FEATURED,
        title: dto.title.trim(),
        body: dto.body.trim(),
        imageUrl: this.optionalText(dto.imageUrl),
        ctaLabel: this.optionalText(dto.ctaLabel),
        ctaUrl,
        requestedBudgetKobo: dto.requestedBudgetKobo ?? 0,
        dailyBudgetKobo: dto.dailyBudgetKobo,
        status: AdCampaignStatus.DRAFT,
        startsAt,
        endsAt,
        targeting: dto.targeting as Prisma.InputJsonValue | undefined
      }});
      await tx.adCampaignRevision.create({ data: {
        campaignId: created.id, revisionNumber: 1, title: created.title, body: created.body,
        imageUrl: created.imageUrl, creativeAltText: this.optionalText(dto.creativeAltText), ctaLabel: created.ctaLabel, ctaUrl,
        requestedBudgetKobo: created.requestedBudgetKobo, dailyBudgetKobo: created.dailyBudgetKobo,
        startsAt, endsAt, placementSurface: created.placementSurface, targeting: dto.targeting as Prisma.InputJsonValue | undefined,
        createdById: userId, createdByType: AdCampaignActorType.VENDOR
      }});
      await tx.adCampaignAuditEvent.create({ data: { campaignId: created.id, actorUserId: userId, actorType: AdCampaignActorType.VENDOR, action: "campaign.created", toStatus: AdCampaignStatus.DRAFT, revisionNumber: 1 } });
      return tx.adCampaign.findUniqueOrThrow({ where: { id: created.id }, include: AD_INCLUDE });
    });

    return this.vendorAd(campaign);
  }

  async vendorUpdate(userId: string, campaignId: string, dto: UpdateAdCampaignDto) {
    const vendor = await this.requireVendor(userId);
    const existing = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, vendorId: vendor.id }, include: AD_INCLUDE });
    if (!existing) throw new NotFoundException("Ad campaign not found");
    if (([AdCampaignStatus.COMPLETED, AdCampaignStatus.EXPIRED, AdCampaignStatus.REJECTED, AdCampaignStatus.CANCELLED] as AdCampaignStatus[]).includes(existing.status)) {
      throw new BadRequestException("This campaign can no longer be edited.");
    }
    const workingRevision = existing.revisions.find((revision) => revision.revisionNumber === existing.currentRevisionNumber);
    const startsAt = dto.startsAt === undefined ? (workingRevision?.startsAt ?? existing.startsAt) : this.optionalDate(dto.startsAt);
    const endsAt = dto.endsAt === undefined ? (workingRevision?.endsAt ?? existing.endsAt) : this.optionalDate(dto.endsAt);
    const requestedBudgetKobo = dto.requestedBudgetKobo ?? workingRevision?.requestedBudgetKobo ?? existing.requestedBudgetKobo;
    const dailyBudgetKobo = dto.dailyBudgetKobo === undefined ? (workingRevision?.dailyBudgetKobo ?? existing.dailyBudgetKobo) : dto.dailyBudgetKobo;
    validateCampaignPlan({ requestedBudgetKobo, dailyBudgetKobo, startsAt, endsAt });
    const revisionNumber = existing.currentRevisionNumber + 1;
    const ctaUrl = dto.ctaUrl === undefined ? (workingRevision?.ctaUrl ?? existing.ctaUrl) : normalizeApprovedDestination(dto.ctaUrl);
    const keepLive = REVISION_REQUIRED_STATUSES.has(existing.status);
    const reviewInvalidated = ([AdCampaignStatus.SUBMITTED, AdCampaignStatus.UNDER_REVIEW, AdCampaignStatus.CHANGES_REQUESTED] as AdCampaignStatus[]).includes(existing.status);
    return this.prisma.$transaction(async (tx) => {
      await tx.adCampaignRevision.create({ data: {
        campaignId, revisionNumber,
        title: dto.title?.trim() ?? workingRevision?.title ?? existing.title, body: dto.body?.trim() ?? workingRevision?.body ?? existing.body,
        imageUrl: dto.imageUrl === undefined ? (workingRevision?.imageUrl ?? existing.imageUrl) : this.optionalText(dto.imageUrl),
        creativeAssetId: workingRevision?.creativeAssetId,
        creativeAltText: dto.creativeAltText === undefined ? workingRevision?.creativeAltText : this.optionalText(dto.creativeAltText),
        ctaLabel: dto.ctaLabel === undefined ? (workingRevision?.ctaLabel ?? existing.ctaLabel) : this.optionalText(dto.ctaLabel), ctaUrl,
        requestedBudgetKobo, dailyBudgetKobo, startsAt, endsAt,
        placementSurface: dto.placementSurface ?? existing.placementSurface,
        targeting: (dto.targeting ?? workingRevision?.targeting ?? existing.targeting) as Prisma.InputJsonValue | undefined,
        createdById: userId, createdByType: AdCampaignActorType.VENDOR, changeReason: this.optionalText(dto.changeReason)
      }});
      await tx.adCampaign.update({ where: { id: campaignId }, data: {
        currentRevisionNumber: revisionNumber,
        ...(!keepLive ? {
          title: dto.title?.trim() ?? existing.title, body: dto.body?.trim() ?? existing.body,
          imageUrl: dto.imageUrl === undefined ? existing.imageUrl : this.optionalText(dto.imageUrl),
          ctaLabel: dto.ctaLabel === undefined ? existing.ctaLabel : this.optionalText(dto.ctaLabel), ctaUrl,
          requestedBudgetKobo, dailyBudgetKobo, startsAt, endsAt,
          placementSurface: dto.placementSurface ?? existing.placementSurface,
          targeting: (dto.targeting ?? existing.targeting) as Prisma.InputJsonValue | undefined,
          status: reviewInvalidated ? AdCampaignStatus.DRAFT : existing.status
        } : {})
      }});
      await tx.adCampaignAuditEvent.create({ data: { campaignId, actorUserId: userId, actorType: AdCampaignActorType.VENDOR, action: keepLive ? "revision.created" : "campaign.edited", fromStatus: existing.status, toStatus: keepLive ? existing.status : (reviewInvalidated ? AdCampaignStatus.DRAFT : existing.status), revisionNumber, reason: this.optionalText(dto.changeReason) } });
      return this.vendorAd(await tx.adCampaign.findUniqueOrThrow({ where: { id: campaignId }, include: AD_INCLUDE }));
    });
  }

  async vendorTransition(userId: string, campaignId: string, dto: TransitionAdCampaignDto) {
    const vendor = await this.requireVendor(userId);
    const campaign = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, vendorId: vendor.id }, include: AD_INCLUDE });
    if (!campaign) throw new NotFoundException("Ad campaign not found");
    const ownerTargets: AdCampaignStatus[] = [AdCampaignStatus.SUBMITTED, AdCampaignStatus.CANCELLED, AdCampaignStatus.PAUSED, AdCampaignStatus.ACTIVE];
    if (!ownerTargets.includes(dto.status)) throw new BadRequestException("Campaign owners cannot perform that transition.");
    return this.transitionCampaign(userId, AdCampaignActorType.VENDOR, campaign, dto);
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

    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    validateCampaignPlan({ requestedBudgetKobo: dto.requestedBudgetKobo, dailyBudgetKobo: dto.dailyBudgetKobo, startsAt, endsAt });
    const ctaUrl = normalizeApprovedDestination(dto.ctaUrl);
    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.adCampaign.create({ data: {
        campaignReference: await this.uniqueCampaignReference(),
        sponsorType,
        vendorId: dto.vendorId,
        placementSurface: dto.placementSurface ?? AdPlacementSurface.CUSTOMER_HOME_FEATURED,
        title: dto.title.trim(),
        body: dto.body.trim(),
        imageUrl: this.optionalText(dto.imageUrl),
        ctaLabel: this.optionalText(dto.ctaLabel),
        ctaUrl,
        advertiserName: this.optionalText(dto.advertiserName),
        advertiserContactName: this.optionalText(dto.advertiserContactName),
        advertiserEmail: this.optionalText(dto.advertiserEmail),
        advertiserPhone: this.optionalText(dto.advertiserPhone),
        requestedBudgetKobo: dto.requestedBudgetKobo ?? 0,
        dailyBudgetKobo: dto.dailyBudgetKobo,
        status: AdCampaignStatus.DRAFT,
        startsAt,
        endsAt,
        targeting: dto.targeting as Prisma.InputJsonValue | undefined
      }});
      await tx.adCampaignRevision.create({ data: {
        campaignId: created.id, revisionNumber: 1, title: created.title, body: created.body,
        imageUrl: created.imageUrl, creativeAltText: this.optionalText(dto.creativeAltText), ctaLabel: created.ctaLabel, ctaUrl,
        requestedBudgetKobo: created.requestedBudgetKobo, dailyBudgetKobo: created.dailyBudgetKobo, startsAt, endsAt,
        placementSurface: created.placementSurface, targeting: dto.targeting as Prisma.InputJsonValue | undefined,
        createdById: adminUserId, createdByType: AdCampaignActorType.ADMIN
      }});
      await tx.adCampaignAuditEvent.create({ data: { campaignId: created.id, actorUserId: adminUserId, actorType: AdCampaignActorType.ADMIN, action: "campaign.created", toStatus: AdCampaignStatus.DRAFT, revisionNumber: 1 } });
      return tx.adCampaign.findUniqueOrThrow({ where: { id: created.id }, include: AD_INCLUDE });
    });

    await this.audit.record(adminUserId, "ad_campaign.created", "AdCampaign", campaign.id, {
      campaignReference: campaign.campaignReference,
      sponsorType: campaign.sponsorType,
      status: campaign.status
    });
    return this.adminAd(campaign);
  }

  async adminUpdate(adminUserId: string, campaignId: string, dto: UpdateAdCampaignDto) {
    const existing = await this.prisma.adCampaign.findUnique({ where: { id: campaignId }, include: AD_INCLUDE });
    if (!existing) throw new NotFoundException("Ad campaign not found");

    if (dto.status !== undefined) {
      throw new BadRequestException("Use a governed campaign action instead of setting status directly.");
    }
    const workingRevision = existing.revisions.find((revision) => revision.revisionNumber === existing.currentRevisionNumber);
    const startsAt = dto.startsAt === undefined ? (workingRevision?.startsAt ?? existing.startsAt) : this.optionalDate(dto.startsAt);
    const endsAt = dto.endsAt === undefined ? (workingRevision?.endsAt ?? existing.endsAt) : this.optionalDate(dto.endsAt);
    const requestedBudgetKobo = dto.requestedBudgetKobo ?? workingRevision?.requestedBudgetKobo ?? existing.requestedBudgetKobo;
    const dailyBudgetKobo = dto.dailyBudgetKobo === undefined ? (workingRevision?.dailyBudgetKobo ?? existing.dailyBudgetKobo) : dto.dailyBudgetKobo;
    validateCampaignPlan({ requestedBudgetKobo, dailyBudgetKobo, startsAt, endsAt });
    const ctaUrl = dto.ctaUrl === undefined ? (workingRevision?.ctaUrl ?? existing.ctaUrl) : normalizeApprovedDestination(dto.ctaUrl);

    const nextReservedCreditKobo = dto.reservedCreditKobo;
    if (existing.vendorId && nextReservedCreditKobo !== undefined) {
      await this.setReservation(adminUserId, existing.vendorId, existing.id, nextReservedCreditKobo, existing.reservedCreditKobo);
    }

    const revisionNumber = existing.currentRevisionNumber + 1;
    const keepLive = REVISION_REQUIRED_STATUSES.has(existing.status);
    const campaign = await this.prisma.$transaction(async (tx) => {
      const priorRevision = existing.revisions.find((revision) => revision.revisionNumber === existing.currentRevisionNumber);
      await tx.adCampaignRevision.create({ data: {
        campaignId, revisionNumber,
        title: dto.title?.trim() ?? priorRevision?.title ?? existing.title,
        body: dto.body?.trim() ?? priorRevision?.body ?? existing.body,
        imageUrl: dto.imageUrl === undefined ? (priorRevision?.imageUrl ?? existing.imageUrl) : this.optionalText(dto.imageUrl),
        creativeAssetId: priorRevision?.creativeAssetId,
        creativeAltText: dto.creativeAltText === undefined ? priorRevision?.creativeAltText : this.optionalText(dto.creativeAltText),
        ctaLabel: dto.ctaLabel === undefined ? (priorRevision?.ctaLabel ?? existing.ctaLabel) : this.optionalText(dto.ctaLabel),
        ctaUrl, requestedBudgetKobo, dailyBudgetKobo, startsAt, endsAt,
        placementSurface: dto.placementSurface ?? existing.placementSurface,
        targeting: (dto.targeting ?? existing.targeting) as Prisma.InputJsonValue | undefined,
        createdById: adminUserId, createdByType: AdCampaignActorType.ADMIN,
        changeReason: this.optionalText(dto.changeReason)
      }});
      await tx.adCampaign.update({ where: { id: campaignId }, data: {
        currentRevisionNumber: revisionNumber,
        ...(!keepLive ? {
          ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
          ...(dto.body === undefined ? {} : { body: dto.body.trim() }),
          ...(dto.imageUrl === undefined ? {} : { imageUrl: this.optionalText(dto.imageUrl) }),
          ...(dto.ctaLabel === undefined ? {} : { ctaLabel: this.optionalText(dto.ctaLabel) }),
          ...(dto.ctaUrl === undefined ? {} : { ctaUrl }),
          ...(dto.requestedBudgetKobo === undefined ? {} : { requestedBudgetKobo: dto.requestedBudgetKobo }),
          ...(dto.dailyBudgetKobo === undefined ? {} : { dailyBudgetKobo: dto.dailyBudgetKobo }),
          ...(dto.startsAt === undefined ? {} : { startsAt }),
          ...(dto.endsAt === undefined ? {} : { endsAt }),
          ...(dto.placementSurface === undefined ? {} : { placementSurface: dto.placementSurface }),
          ...(dto.targeting === undefined ? {} : { targeting: dto.targeting as Prisma.InputJsonValue })
        } : {}),
        ...(nextReservedCreditKobo === undefined ? {} : { reservedCreditKobo: nextReservedCreditKobo }),
        ...(dto.adminNote === undefined ? {} : { adminNote: this.optionalText(dto.adminNote) }),
        ...(dto.rejectionReason === undefined ? {} : { rejectionReason: this.optionalText(dto.rejectionReason) })
      }});
      await tx.adCampaignAuditEvent.create({ data: {
        campaignId, actorUserId: adminUserId, actorType: AdCampaignActorType.ADMIN,
        action: "campaign.admin_edited", fromStatus: existing.status, toStatus: existing.status,
        revisionNumber, reason: this.optionalText(dto.changeReason),
        changedFields: Object.keys(dto).filter((key) => key !== "status")
      }});
      return tx.adCampaign.findUniqueOrThrow({ where: { id: campaignId }, include: AD_INCLUDE });
    });

    await this.audit.record(adminUserId, "ad_campaign.updated", "AdCampaign", campaign.id, {
      campaignReference: campaign.campaignReference,
      previousStatus: existing.status,
      status: campaign.status,
      reservedCreditKobo: campaign.reservedCreditKobo
    });
    return this.adminAd(campaign);
  }

  async adminTransition(adminUserId: string, campaignId: string, dto: TransitionAdCampaignDto) {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id: campaignId }, include: AD_INCLUDE });
    if (!campaign) throw new NotFoundException("Ad campaign not found");
    return this.transitionCampaign(adminUserId, AdCampaignActorType.ADMIN, campaign, dto);
  }

  async recordEvent(campaignId: string, dto: RecordAdEventDto, privacyToken?: string) {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id: campaignId }, include: AD_INCLUDE });
    const revision = campaign?.approvedRevision;
    if (!campaign || !revision || campaign.status !== AdCampaignStatus.ACTIVE || revision.id !== campaign.approvedRevisionId) {
      throw new NotFoundException("Active ad campaign not found");
    }
    const now = new Date();
    if ((campaign.startsAt && campaign.startsAt > now) || (campaign.endsAt && campaign.endsAt < now) || (campaign.requestedBudgetKobo > 0 && campaign.spentKobo >= campaign.requestedBudgetKobo)) {
      throw new NotFoundException("Active ad campaign not found");
    }
    const dedupeSource = dto.renderToken && privacyToken ? `${campaign.id}:${revision.id}:${dto.eventType}:${dto.renderToken}:${privacyToken}` : undefined;
    const dedupeKeyHash = dedupeSource ? this.hashPrivacyToken(dedupeSource) : undefined;
    try {
      await this.prisma.adCampaignEvent.create({ data: {
        campaignId: campaign.id, revisionId: revision.id, eventType: dto.eventType,
        placement: dto.placement, dedupeKeyHash, costKobo: 0
      }});
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
    return { recorded: true, destination: dto.eventType === AdCampaignEventType.CLICK ? revision.ctaUrl : undefined };
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

  private async transitionCampaign(
    actorUserId: string,
    actorType: AdCampaignActorType,
    campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>,
    dto: TransitionAdCampaignDto
  ) {
    assertAdTransition(campaign.status, dto.status);
    if (dto.status === AdCampaignStatus.SUBMITTED) {
      const pending = campaign.revisions.find((revision) => revision.revisionNumber === campaign.currentRevisionNumber);
      if (!pending) throw new BadRequestException("Campaign revision is missing.");
      validateCampaignPlan({ requestedBudgetKobo: pending.requestedBudgetKobo, dailyBudgetKobo: pending.dailyBudgetKobo, startsAt: pending.startsAt, endsAt: pending.endsAt });
    }
    if (([AdCampaignStatus.CHANGES_REQUESTED, AdCampaignStatus.REJECTED] as AdCampaignStatus[]).includes(dto.status) && !dto.reason?.trim()) {
      throw new BadRequestException("A review reason is required.");
    }
    if (actorType === AdCampaignActorType.VENDOR && !([AdCampaignStatus.SUBMITTED, AdCampaignStatus.CANCELLED, AdCampaignStatus.PAUSED, AdCampaignStatus.ACTIVE] as AdCampaignStatus[]).includes(dto.status)) {
      throw new BadRequestException("Campaign owners cannot perform that transition.");
    }
    const revision = campaign.revisions.find((item) => item.revisionNumber === campaign.currentRevisionNumber);
    const approved = dto.status === AdCampaignStatus.APPROVED;
    const published = dto.status === AdCampaignStatus.ACTIVE;
    const release = ([AdCampaignStatus.REJECTED, AdCampaignStatus.CANCELLED, AdCampaignStatus.EXPIRED, AdCampaignStatus.COMPLETED] as AdCampaignStatus[]).includes(dto.status);
    if (campaign.vendorId && release && campaign.reservedCreditKobo > 0) {
      await this.setReservation(actorUserId, campaign.vendorId, campaign.id, 0, campaign.reservedCreditKobo);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.adCampaign.update({ where: { id: campaign.id }, data: {
        status: dto.status,
        ...(approved && revision ? { approvedRevisionId: revision.id, reviewedByAdminId: actorUserId, reviewedAt: new Date() } : {}),
        ...(dto.status === AdCampaignStatus.CHANGES_REQUESTED ? { adminNote: dto.reason } : {}),
        ...(dto.status === AdCampaignStatus.REJECTED ? { rejectionReason: dto.reason } : {}),
        ...(release ? { reservedCreditKobo: 0 } : {})
      }});
      if (revision && ([AdCampaignStatus.SUBMITTED, AdCampaignStatus.APPROVED, AdCampaignStatus.ACTIVE] as AdCampaignStatus[]).includes(dto.status)) {
        await tx.adCampaignRevision.update({ where: { id: revision.id }, data: {
          ...(dto.status === AdCampaignStatus.SUBMITTED ? { submittedAt: new Date() } : {}),
          ...(approved ? { approvedAt: new Date(), reviewNotes: this.optionalText(dto.reason) } : {}),
          ...(published ? { publishedAt: new Date() } : {})
        }});
      }
      await tx.adCampaignAuditEvent.create({ data: {
        campaignId: campaign.id, actorUserId, actorType, action: "campaign.transitioned",
        fromStatus: campaign.status, toStatus: dto.status, revisionNumber: campaign.currentRevisionNumber,
        reason: this.optionalText(dto.reason)
      }});
      return tx.adCampaign.findUniqueOrThrow({ where: { id: campaign.id }, include: AD_INCLUDE });
    });
    return actorType === AdCampaignActorType.ADMIN ? this.adminAd(updated) : this.vendorAd(updated);
  }

  private publicAd(campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>) {
    const revision = campaign.approvedRevision;
    return {
      id: campaign.id,
      campaignReference: campaign.campaignReference,
      placementSurface: campaign.placementSurface,
      revisionId: revision?.id,
      title: revision?.title ?? campaign.title,
      body: revision?.body ?? campaign.body,
      imageUrl: revision?.creativeAsset ? `/ads/creative/${revision.creativeAsset.id}` : (revision?.imageUrl ?? campaign.imageUrl),
      creativeAltText: revision?.creativeAltText,
      ctaLabel: revision?.ctaLabel ?? campaign.ctaLabel,
      hasDestination: Boolean(revision?.ctaUrl ?? campaign.ctaUrl),
      sponsorType: campaign.sponsorType,
      sponsorName: campaign.vendor?.businessName ?? campaign.advertiserName ?? "KariGO partner",
      label: "Ad"
    };
  }

  private vendorAd(campaign: Prisma.AdCampaignGetPayload<{ include: typeof AD_INCLUDE }>, analytics = { impressions: 0, clicks: 0, spendKobo: 0, ctr: 0 }) {
    return {
      ...this.publicAd(campaign),
      requestedBudgetKobo: campaign.requestedBudgetKobo,
      reservedCreditKobo: campaign.reservedCreditKobo,
      dailyBudgetKobo: campaign.dailyBudgetKobo,
      spentKobo: campaign.spentKobo,
      remainingBudgetKobo: Math.max(0, campaign.requestedBudgetKobo - campaign.spentKobo),
      analytics,
      status: campaign.status,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      adminNote: campaign.adminNote,
      rejectionReason: campaign.rejectionReason,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
      ,currentRevisionNumber: campaign.currentRevisionNumber,
      approvedRevisionId: campaign.approvedRevisionId,
      revisions: campaign.revisions.map((revision) => ({
        id: revision.id, revisionNumber: revision.revisionNumber, createdByType: revision.createdByType,
        changeReason: revision.changeReason, reviewNotes: revision.reviewNotes, submittedAt: revision.submittedAt,
        approvedAt: revision.approvedAt, publishedAt: revision.publishedAt, createdAt: revision.createdAt
      }))
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
      ,auditEvents: campaign.auditEvents
    };
  }

  private analyticsFor(campaignId: string, grouped: Array<{ campaignId: string; eventType: AdCampaignEventType; _count: { _all: number }; _sum: { costKobo: number | null } }>) {
    const impressions = grouped.find((item) => item.campaignId === campaignId && item.eventType === AdCampaignEventType.IMPRESSION)?._count._all ?? 0;
    const clicks = grouped.find((item) => item.campaignId === campaignId && item.eventType === AdCampaignEventType.CLICK)?._count._all ?? 0;
    const spendKobo = grouped.filter((item) => item.campaignId === campaignId).reduce((sum, item) => sum + (item._sum.costKobo ?? 0), 0);
    return { impressions, clicks, spendKobo, ctr: ctr(impressions, clicks) };
  }

  private hashPrivacyToken(value: string) {
    return createHash("sha256").update(value).digest("hex");
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
