const {
  AdCampaignActorType,
  AdCampaignEventType,
  AdCampaignStatus,
  AdPlacementSurface,
  AdSponsorType,
  PrismaClient,
} = require("@prisma/client");

const prisma = new PrismaClient();
const qaWebsiteOrigin = process.env.QA_WEBSITE_ORIGIN ?? "http://localhost:3002";

const IDS = {
  draft: "10000000-0000-4000-8000-000000000001",
  changes: "10000000-0000-4000-8000-000000000002",
  review: "10000000-0000-4000-8000-000000000003",
  active: "10000000-0000-4000-8000-000000000004",
  completed: "10000000-0000-4000-8000-000000000005",
};

function assertLocalQaTarget() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.KARIGO_LOCAL_QA !== "1") throw new Error("KARIGO_LOCAL_QA=1 is required");
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw new Error("Production is forbidden");
  if (!/127\.0\.0\.1|localhost/.test(url) || !/karigo_ads_qa_/.test(url)) throw new Error("Only a loopback karigo_ads_qa_* database is allowed");
}

async function upsertCampaign({ id, reference, vendorId, userId, status, title, body, budget, dailyBudget, startsAt, endsAt, targeting, revisionStatus }) {
  await prisma.adCampaign.upsert({
    where: { campaignReference: reference },
    update: {},
    create: {
      id,
      campaignReference: reference,
      sponsorType: AdSponsorType.VENDOR,
      vendorId,
      placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED,
      title,
      body,
      imageUrl: `${qaWebsiteOrigin}/qa/ads-synthetic.svg`,
      ctaLabel: "Order now",
      ctaUrl: "https://karigo.com.ng/vendors",
      requestedBudgetKobo: budget,
      dailyBudgetKobo: dailyBudget,
      reservedCreditKobo: [AdCampaignStatus.ACTIVE, AdCampaignStatus.APPROVED, AdCampaignStatus.SCHEDULED, AdCampaignStatus.PAUSED].includes(status) ? budget : 0,
      spentKobo: 0,
      status,
      currentRevisionNumber: 1,
      targeting,
      startsAt,
      endsAt,
      submittedAt: new Date("2026-09-28T10:00:00.000Z"),
    },
  });
  const revision = await prisma.adCampaignRevision.upsert({
    where: { campaignId_revisionNumber: { campaignId: id, revisionNumber: 1 } },
    update: {},
    create: {
      campaignId: id,
      revisionNumber: 1,
      title,
      body,
      imageUrl: `${qaWebsiteOrigin}/qa/ads-synthetic.svg`,
      creativeAltText: "Synthetic QA meal offer from Kano Kitchen",
      ctaLabel: "Order now",
      ctaUrl: "https://karigo.com.ng/vendors",
      requestedBudgetKobo: budget,
      dailyBudgetKobo: dailyBudget,
      startsAt,
      endsAt,
      placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED,
      targeting,
      createdById: userId,
      createdByType: AdCampaignActorType.VENDOR,
      submittedAt: revisionStatus === "DRAFT" ? null : new Date("2026-09-28T10:00:00.000Z"),
      approvedAt: ["APPROVED", "ACTIVE", "COMPLETED"].includes(revisionStatus) ? new Date("2026-09-29T10:00:00.000Z") : null,
      publishedAt: ["ACTIVE", "COMPLETED"].includes(revisionStatus) ? new Date("2026-09-30T10:00:00.000Z") : null,
    },
  });
  if ([AdCampaignStatus.ACTIVE, AdCampaignStatus.APPROVED, AdCampaignStatus.SCHEDULED, AdCampaignStatus.PAUSED, AdCampaignStatus.COMPLETED].includes(status)) {
    await prisma.adCampaign.update({ where: { id }, data: { approvedRevisionId: revision.id } });
  }
  await prisma.adCampaignAuditEvent.create({
    data: { campaignId: id, actorUserId: userId, actorType: AdCampaignActorType.VENDOR, action: "qa-fixture.created", toStatus: status, revisionNumber: 1 },
  });
  return revision;
}

async function main() {
  assertLocalQaTarget();
  const [vendorUser, adminUser, customerUser] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { phoneNumber: "+2348000000101" } }),
    prisma.user.findUniqueOrThrow({ where: { phoneNumber: "+2348000000000" } }),
    prisma.user.findUniqueOrThrow({ where: { phoneNumber: "+2348000000201" } }),
  ]);
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
  await prisma.vendorAdCreditAccount.upsert({
    where: { vendorId: vendor.id },
    update: { balanceKobo: 5000000, reservedKobo: 300000, lifetimeGrantedKobo: 5000000, lifetimeSpentKobo: 0 },
    create: { vendorId: vendor.id, balanceKobo: 5000000, reservedKobo: 300000, lifetimeGrantedKobo: 5000000, lifetimeSpentKobo: 0 },
  });

  await prisma.adCampaignEvent.deleteMany({ where: { campaignId: { in: Object.values(IDS) } } });
  await prisma.adCampaignAuditEvent.deleteMany({ where: { campaignId: { in: Object.values(IDS) } } });
  await prisma.adCampaignRevision.deleteMany({ where: { campaignId: { in: Object.values(IDS) } } });
  await prisma.adCampaign.deleteMany({ where: { id: { in: Object.values(IDS) } } });

  const now = new Date();
  await upsertCampaign({ id: IDS.draft, reference: "AD-QA-DRAFT", vendorId: vendor.id, userId: vendorUser.id, status: AdCampaignStatus.DRAFT, revisionStatus: "DRAFT", title: "Synthetic draft campaign", body: "A deterministic draft used only for local authenticated QA.", budget: 120000, dailyBudget: 20000, startsAt: null, endsAt: null, targeting: { cityCodes: ["Kano"], serviceCategories: ["FOOD"] } });
  await upsertCampaign({ id: IDS.changes, reference: "AD-QA-CHANGES", vendorId: vendor.id, userId: vendorUser.id, status: AdCampaignStatus.CHANGES_REQUESTED, revisionStatus: "CHANGES_REQUESTED", title: "Synthetic returned campaign", body: "Returned for a safe local edit and resubmission check.", budget: 140000, dailyBudget: 25000, startsAt: null, endsAt: null, targeting: { cityCodes: ["Kano"] } });
  await upsertCampaign({ id: IDS.review, reference: "AD-QA-REVIEW", vendorId: vendor.id, userId: vendorUser.id, status: AdCampaignStatus.UNDER_REVIEW, revisionStatus: "UNDER_REVIEW", title: "Synthetic review campaign", body: "Awaiting a governed admin decision in the local QA database.", budget: 160000, dailyBudget: 30000, startsAt: null, endsAt: null, targeting: {} });
  const activeRevision = await upsertCampaign({ id: IDS.active, reference: "AD-QA-ACTIVE", vendorId: vendor.id, userId: vendorUser.id, status: AdCampaignStatus.ACTIVE, revisionStatus: "ACTIVE", title: "Kano Kitchen QA offer", body: "Synthetic sponsored content for responsive and click-flow verification.", budget: 300000, dailyBudget: 50000, startsAt: new Date(now.getTime() - 10 * 86400000), endsAt: new Date(now.getTime() + 10 * 86400000), targeting: {} });
  await upsertCampaign({ id: IDS.completed, reference: "AD-QA-COMPLETE", vendorId: vendor.id, userId: vendorUser.id, status: AdCampaignStatus.COMPLETED, revisionStatus: "COMPLETED", title: "Synthetic completed campaign", body: "Historical fixture for completed-campaign presentation.", budget: 100000, dailyBudget: 10000, startsAt: new Date(now.getTime() - 40 * 86400000), endsAt: new Date(now.getTime() - 5 * 86400000), targeting: {} });

  await prisma.adCampaignRevision.create({ data: {
    campaignId: IDS.active, revisionNumber: 2, title: "Pending replacement title", body: "This replacement is under review while revision one stays live.", imageUrl: `${qaWebsiteOrigin}/qa/ads-synthetic.svg`, creativeAltText: "Pending synthetic campaign creative", ctaLabel: "Learn more", ctaUrl: "https://karigo.com.ng/vendors", requestedBudgetKobo: 300000, dailyBudgetKobo: 50000, startsAt: new Date(now.getTime() - 10 * 86400000), endsAt: new Date(now.getTime() + 10 * 86400000), placementSurface: AdPlacementSurface.CUSTOMER_HOME_FEATURED, targeting: { cityCodes: ["Abuja"] }, createdById: vendorUser.id, createdByType: AdCampaignActorType.VENDOR, changeReason: "Local replacement-revision QA", submittedAt: new Date(),
  } });
  await prisma.adCampaign.update({ where: { id: IDS.active }, data: { currentRevisionNumber: 2, approvedRevisionId: activeRevision.id } });
  await prisma.adCampaignAuditEvent.create({ data: { campaignId: IDS.active, actorUserId: vendorUser.id, actorType: AdCampaignActorType.VENDOR, action: "revision.transitioned", fromStatus: AdCampaignStatus.DRAFT, toStatus: AdCampaignStatus.UNDER_REVIEW, revisionNumber: 2 } });

  const events = [];
  for (let day = 0; day < 30; day += 1) {
    if ([3, 8, 17, 24].includes(day)) continue;
    const at = new Date(now.getTime() - day * 86400000);
    for (let i = 0; i < (day % 5) + 1; i += 1) events.push({ campaignId: IDS.active, revisionId: activeRevision.id, eventType: AdCampaignEventType.IMPRESSION, placement: AdPlacementSurface.CUSTOMER_HOME_FEATURED, dedupeKeyHash: `qa-i-${day}-${i}`, occurredAt: at, costKobo: 0 });
    if (day % 3 === 0) events.push({ campaignId: IDS.active, revisionId: activeRevision.id, eventType: AdCampaignEventType.CLICK, placement: AdPlacementSurface.CUSTOMER_HOME_FEATURED, dedupeKeyHash: `qa-c-${day}`, occurredAt: at, costKobo: 250 });
  }
  await prisma.adCampaignEvent.createMany({ data: events });
  const recordedSpendKobo = events.reduce((sum, event) => sum + event.costKobo, 0);
  await prisma.adCampaign.update({ where: { id: IDS.active }, data: { spentKobo: recordedSpendKobo } });
  await prisma.vendorAdCreditAccount.update({ where: { vendorId: vendor.id }, data: { lifetimeSpentKobo: recordedSpendKobo } });
  await prisma.accountSecurityEvent.create({ data: { userId: customerUser.id, action: "qa_fixture.ready", metadata: { scope: "ads-phone-local-qa" } } });
  await prisma.accountSecurityEvent.create({ data: { userId: adminUser.id, action: "qa_fixture.ready", metadata: { scope: "ads-phone-local-qa" } } });
  console.info("Synthetic local Ads/phone QA fixtures are ready.");
}

main().finally(() => prisma.$disconnect());
