import { AdCampaignActorType, AdCampaignStatus, AdPlacementSurface, AdSponsorType } from "@prisma/client";
import { AdsService } from "./ads.service";

function liveCampaign() {
  const revision1 = { id: "revision-1", campaignId: "campaign-1", revisionNumber: 1, title: "Live", body: "Live body", imageUrl: null, creativeAssetId: null, creativeAltText: null, ctaLabel: null, ctaUrl: null, requestedBudgetKobo: 10_000, dailyBudgetKobo: 1_000, startsAt: null, endsAt: null, placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED, targeting: {}, createdById: "vendor-user", createdByType: AdCampaignActorType.VENDOR, changeReason: null, reviewNotes: null, submittedAt: new Date(), approvedAt: new Date(), publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), creativeAsset: null };
  return { id: "campaign-1", vendorId: "vendor-1", campaignReference: "AD-1", sponsorType: AdSponsorType.VENDOR, placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED, title: "Live", body: "Live body", imageUrl: null, ctaLabel: null, ctaUrl: null, advertiserName: null, advertiserContactName: null, advertiserEmail: null, advertiserPhone: null, requestedBudgetKobo: 10_000, dailyBudgetKobo: 1_000, reservedCreditKobo: 10_000, spentKobo: 0, status: AdCampaignStatus.ACTIVE, currentRevisionNumber: 1, approvedRevisionId: revision1.id, targeting: {}, startsAt: null, endsAt: null, adminNote: null, rejectionReason: null, reviewedByAdminId: null, reviewedAt: null, submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), vendor: { id: "vendor-1", businessName: "Vendor", logoUrl: null, city: "Abuja", state: "FCT" }, approvedRevision: revision1, revisions: [revision1], auditEvents: [] } as any;
}

function harness(campaign = liveCampaign()) {
  const tx = {
    adCampaignRevision: { create: jest.fn(), update: jest.fn() },
    adCampaign: { update: jest.fn(), findUniqueOrThrow: jest.fn().mockResolvedValue(campaign) },
    adCampaignAuditEvent: { create: jest.fn() }
  };
  const prisma = {
    vendor: { findFirst: jest.fn().mockResolvedValue({ id: "vendor-1", businessName: "Vendor" }) },
    adCampaign: { findFirst: jest.fn().mockResolvedValue(campaign), findUnique: jest.fn().mockResolvedValue(campaign) },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))
  } as any;
  return { service: new AdsService(prisma, { record: jest.fn() } as any), prisma, tx };
}

describe("AdsService revision safety", () => {
  it("rejects arbitrary vendor image URLs before any campaign mutation", async () => {
    const { service, prisma } = harness();
    await expect(service.vendorUpdate("vendor-user", "campaign-1", { imageUrl: "https://example.test/untrusted.png" }))
      .rejects.toThrow("must be uploaded as validated image files");
    expect(prisma.adCampaign.findFirst).not.toHaveBeenCalled();
  });

  it("creates a replacement revision without mutating active delivery fields", async () => {
    const { service, tx } = harness();
    await service.vendorUpdate("vendor-user", "campaign-1", { title: "Replacement", body: "Replacement body", changeReason: "Refresh" });
    expect(tx.adCampaignRevision.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ revisionNumber: 2, title: "Replacement" }) }));
    expect(tx.adCampaign.update).toHaveBeenCalledWith({ where: { id: "campaign-1" }, data: { currentRevisionNumber: 2 } });
  });

  it("submits a replacement for review while keeping the live campaign active", async () => {
    const campaign = liveCampaign();
    campaign.currentRevisionNumber = 2;
    campaign.revisions.unshift({ ...campaign.revisions[0], id: "revision-2", revisionNumber: 2, title: "Replacement", submittedAt: null, approvedAt: null, publishedAt: null });
    const { service, tx } = harness(campaign);
    await service.vendorTransition("vendor-user", "campaign-1", { status: AdCampaignStatus.SUBMITTED });
    expect(tx.adCampaignRevision.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "revision-2" }, data: expect.objectContaining({ submittedAt: expect.any(Date) }) }));
    expect(tx.adCampaign.update).not.toHaveBeenCalled();
    expect(tx.adCampaignAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "revision.transitioned", toStatus: AdCampaignStatus.SUBMITTED }) }));
  });

  it("still permits pausing the approved live campaign while a replacement is pending", async () => {
    const campaign = liveCampaign();
    campaign.currentRevisionNumber = 2;
    campaign.revisions.unshift({ ...campaign.revisions[0], id: "revision-2", revisionNumber: 2, title: "Replacement", submittedAt: null, approvedAt: null, publishedAt: null });
    const { service, tx } = harness(campaign);
    await service.vendorTransition("vendor-user", "campaign-1", { status: AdCampaignStatus.PAUSED });
    expect(tx.adCampaign.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: AdCampaignStatus.PAUSED }) }));
  });

  it("promotes only the reviewed replacement and preserves ACTIVE lifecycle", async () => {
    const campaign = liveCampaign();
    campaign.currentRevisionNumber = 2;
    campaign.revisions.unshift({ ...campaign.revisions[0], id: "revision-2", revisionNumber: 2, title: "Approved replacement", submittedAt: new Date(), approvedAt: null, publishedAt: null });
    campaign.auditEvents = [{ id: "audit-1", campaignId: campaign.id, actorUserId: "admin", actorType: AdCampaignActorType.ADMIN, action: "revision.transitioned", fromStatus: AdCampaignStatus.SUBMITTED, toStatus: AdCampaignStatus.UNDER_REVIEW, revisionNumber: 2, reason: null, changedFields: null, createdAt: new Date() }];
    const { service, tx } = harness(campaign);
    await service.adminTransition("admin", "campaign-1", { status: AdCampaignStatus.APPROVED });
    expect(tx.adCampaign.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "campaign-1" }, data: expect.objectContaining({ approvedRevisionId: "revision-2", title: "Approved replacement" }) }));
    expect(tx.adCampaign.update.mock.calls[0][0].data.status).toBeUndefined();
  });
});

describe("AdsService customer delivery gates", () => {
  function deliveryHarness(campaign: any, spentTodayKobo = 0) {
    const prisma = {
      address: { findFirst: jest.fn().mockResolvedValue({ city: "Abuja", state: "FCT" }) },
      adCampaign: { findMany: jest.fn().mockResolvedValue([campaign]) },
      adCampaignEvent: { groupBy: jest.fn().mockResolvedValue([{ campaignId: campaign.id, _sum: { costKobo: spentTodayKobo } }]) }
    } as any;
    return new AdsService(prisma, { record: jest.fn() } as any);
  }

  it("rejects a placement mismatch even when a malformed repository result is returned", async () => {
    const campaign = liveCampaign();
    campaign.approvedRevision.placementSurface = "UNSUPPORTED" as AdPlacementSurface;
    const result = await deliveryHarness(campaign).customerHome("customer-1");
    expect(result.items).toHaveLength(0);
  });

  it("rejects campaigns outside their approved revision schedule", async () => {
    const campaign = liveCampaign();
    campaign.approvedRevision.startsAt = new Date(Date.now() + 60_000);
    const result = await deliveryHarness(campaign).customerHome("customer-1");
    expect(result.items).toHaveLength(0);
  });

  it("rejects campaigns whose total or daily budget is exhausted", async () => {
    const total = liveCampaign();
    total.spentKobo = total.approvedRevision.requestedBudgetKobo;
    expect((await deliveryHarness(total).customerHome("customer-1")).items).toHaveLength(0);

    const daily = liveCampaign();
    expect((await deliveryHarness(daily, daily.approvedRevision.dailyBudgetKobo).customerHome("customer-1")).items).toHaveLength(0);
  });
});
