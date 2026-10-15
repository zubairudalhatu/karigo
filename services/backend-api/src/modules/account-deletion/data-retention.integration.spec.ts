import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdtemp, rmdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DataRetentionService } from "./data-retention.service";
import { TemporaryPiiExports } from "./temporary-pii-exports";
import { PrismaService } from "../../prisma/prisma.service";

const url = process.env.KARIGO_DELETION_TEST_DATABASE_URL;
if (url) { const parsed = new URL(url); if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55439" || parsed.pathname !== "/karigo_retention_qa_20261015") throw new Error("Retention fixtures require the dedicated loopback database."); }
const suite = url ? describe : describe.skip;
jest.setTimeout(60_000);
suite("Retention enforcement — synthetic PostgreSQL only", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const service = new DataRetentionService(db as unknown as PrismaService);
  const now = new Date("2019-01-01T00:00:00Z");
  let actorId: string, directory: string;
  const prior = process.env.RETENTION_LEGAL_AUTHORIZER_IDS;
  beforeAll(async () => {
    actorId = (await db.user.create({ data: { fullName: "Synthetic Legal delegate", phoneNumber: `fixture:${randomUUID()}`, passwordHash: "fixture", role: "ADMIN", adminRole: "SUPER_ADMIN", accountStatus: "ACTIVE" } })).id;
    process.env.RETENTION_LEGAL_AUTHORIZER_IDS = actorId;
    directory = await mkdtemp(join(tmpdir(), "karigo-retention-fixtures-"));
  });
  afterAll(async () => { await db.$disconnect(); await rmdir(directory).catch(() => undefined); if (prior === undefined) delete process.env.RETENTION_LEGAL_AUTHORIZER_IDS; else process.env.RETENTION_LEGAL_AUTHORIZER_IDS = prior; });
  async function utility(createdAt = new Date("2010-01-01Z")) {
    const tag = randomUUID();
    const user = await db.user.create({ data: { fullName: "Synthetic retention", phoneNumber: `fixture:${tag}`, passwordHash: "fixture", role: "CUSTOMER", accountStatus: "ACTIVE", customerProfile: { create: { referralCode: tag } } }, include: { customerProfile: true } });
    const provider = await db.utilityProvider.create({ data: { type: "ELECTRICITY", code: `fixture:${tag}`, name: "Synthetic provider" } });
    return db.utilityTransaction.create({ data: { customerId: user.customerProfile!.id, providerId: provider.id, reference: `fixture:${tag}`, serviceType: "ELECTRICITY", amountKobo: 0, totalKobo: 0, recipient: "synthetic", status: "SUCCESSFUL", createdAt } });
  }
  it("dry-run is non-mutating; a due leaf transaction disposes once at financial expiry", async () => {
    const row = await utility();
    expect((await service.run(now, false)).decisions).toContainEqual({ model: "UtilityTransaction", id: row.id, outcome: "ELIGIBLE" });
    expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).not.toBeNull();
    expect((await service.run(now, true)).decisions).toContainEqual({ model: "UtilityTransaction", id: row.id, outcome: "DISPOSED" });
    expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).toBeNull();
    expect((await service.run(now, true)).decisions.some(d => d.id === row.id)).toBe(false);
  });
  it("respects active court holds, expires internal holds, renews/reviews and releases with authority audit", async () => {
    const row = await utility();
    const input = { actorId, authorityReference: "SYNTHETIC-LEGAL-AUTH", resourceType: "UtilityTransaction", resourceId: row.id, kind: "INTERNAL", reasonCode: "SYNTHETIC-CASE" };
    const hold = await service.createHold(input, new Date("2018-01-01Z"));
    await service.reviewHold(hold.id, actorId, "SYNTHETIC-RENEWAL-JUSTIFICATION", "RENEW", new Date("2018-12-01Z"));
    expect((await service.run(now, true)).decisions).toContainEqual({ model: "UtilityTransaction", id: row.id, outcome: "HELD" });
    await service.reviewHold(hold.id, actorId, "SYNTHETIC-REVIEW", "REVIEW", now);
    expect((await db.dataRetentionHold.findUniqueOrThrow({ where: { id: hold.id } })).expiresAt!.toISOString()).toBe("2019-12-01T00:00:00.000Z");
    await service.reviewHold(hold.id, actorId, "SYNTHETIC-RELEASE", "RELEASE", now);
    expect(await db.dataRetentionHoldEvent.count({ where: { holdId: hold.id } })).toBe(4);
    const court = await service.createHold({ ...input, kind: "COURT" }, new Date("2018-01-01Z"));
    expect(court.expiresAt).toBeNull(); expect((await service.run(now, true)).decisions).toContainEqual({ model: "UtilityTransaction", id: row.id, outcome: "HELD" });
    await service.reviewHold(court.id, actorId, "SYNTHETIC-COURT-RELEASE", "RELEASE", now);
    await service.run(now, true); expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).toBeNull();
    const expired = await utility(); await service.createHold({ ...input, resourceId: expired.id }, new Date("2017-01-01Z"));
    await service.run(now, true); expect(await db.utilityTransaction.findUnique({ where: { id: expired.id } })).toBeNull();
    await expect(service.createHold({ ...input, actorId: randomUUID() }, now)).rejects.toThrow();
  });
  it("case resolution extends retention beyond accounting expiry", async () => {
    const row = await utility();
    await service.registerCase("UtilityTransaction", row.id, new Date("2018-01-01Z"), actorId, "SYNTHETIC-FINAL-RESOLUTION");
    await service.run(now, true); expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).not.toBeNull();
    expect((await db.dataRetentionResource.findUniqueOrThrow({ where: { resourceType_resourceId: { resourceType: "UtilityTransaction", resourceId: row.id } } })).retainUntil.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });
  it("disposes ordinary logs at 24 months without removing younger or held records", async () => {
    const old = await db.accountSecurityEvent.create({ data: { userId: actorId, action: "fixture", createdAt: new Date("2016-12-31Z") } });
    const young = await db.accountSecurityEvent.create({ data: { userId: actorId, action: "fixture", createdAt: new Date("2018-01-01Z") } });
    await service.run(now, true); expect(await db.accountSecurityEvent.findUnique({ where: { id: old.id } })).toBeNull(); expect(await db.accountSecurityEvent.findUnique({ where: { id: young.id } })).not.toBeNull();
  });
  it("registered temporary exports expire after 30 days; dry-run and repeat cleanup are safe", async () => {
    const exports = new TemporaryPiiExports(db as unknown as PrismaService, directory);
    await exports.create(Buffer.from("synthetic personal fixture"), new Date("2018-01-01Z"));
    expect((await exports.cleanup(now, false)).eligible).toBe(1); expect(await readdir(directory)).toHaveLength(1);
    expect((await exports.cleanup(now, true)).disposed).toBe(1); expect(await readdir(directory)).toHaveLength(0);
    expect((await exports.cleanup(now, true)).disposed).toBe(0);
  });

  it("expires closed support content at 24 months while preserving a scoped support hold", async () => {
    const row = await utility(new Date("2026-01-01Z"));
    const make = () => db.supportTicket.create({ data: { customerId: row.customerId, ticketNumber: `fixture:${randomUUID()}`, category: "PAYMENT_ISSUE", subject: "Synthetic", description: "Synthetic", status: "CLOSED", closedAt: new Date("2016-01-01Z"), messages: { create: { senderUserId: actorId, senderRole: "ADMIN", message: "Synthetic content" } } } });
    const held = await make(), disposable = await make();
    await service.createHold({ actorId, authorityReference: "SYNTHETIC-SUPPORT-AUTH", resourceType: "SupportTicket", resourceId: held.id, kind: "COURT", reasonCode: "SYNTHETIC-DISPUTE" }, new Date("2018-01-01Z"));
    await service.run(now, true);
    expect(await db.supportTicket.findUnique({ where: { id: held.id } })).not.toBeNull();
    expect(await db.supportTicket.findUnique({ where: { id: disposable.id } })).toBeNull();
    expect(await db.supportTicketMessage.count({ where: { ticketId: disposable.id } })).toBe(0);
  });
  it("unlinks sponsored hashes at 90 days, retains unlinked recent totals and disposes non-financial events at 24 months", async () => {
    const campaign = await db.adCampaign.create({ data: { campaignReference: `fixture:${randomUUID()}`, sponsorType: "EXTERNAL", title: "Synthetic", body: "Synthetic", status: "CANCELLED" } });
    const revision = await db.adCampaignRevision.create({ data: { campaignId: campaign.id, revisionNumber: 1, title: "Synthetic", body: "Synthetic", placementSurface: "CUSTOMER_HOME_FEATURED", createdByType: "ADMIN" } });
    const make = (date: string, costKobo = 0) => db.adCampaignEvent.create({ data: { campaignId: campaign.id, revisionId: revision.id, eventType: "IMPRESSION", placement: "CUSTOMER_HOME_FEATURED", dedupeKeyHash: randomUUID(), occurredAt: new Date(date), costKobo } });
    const unlink = await make("2018-09-01T12:00:00Z"), young = await make("2018-12-01Z"), old = await make("2016-01-01Z"), billing = await make("2016-01-01Z", 5);
    const dry = await service.sponsoredEventRetention(now, false); expect(dry.unlink).toBeGreaterThanOrEqual(3);
    expect((await db.adCampaignEvent.findUniqueOrThrow({ where: { id: unlink.id } })).dedupeKeyHash).not.toBeNull();
    const applied = await service.sponsoredEventRetention(now, true); expect(applied.billingProjectionRequired).toBeGreaterThanOrEqual(1);
    expect((await db.adCampaignEvent.findUniqueOrThrow({ where: { id: unlink.id } })).dedupeKeyHash).toBeNull();
    expect((await db.adCampaignEvent.findUniqueOrThrow({ where: { id: young.id } })).dedupeKeyHash).not.toBeNull();
    expect(await db.adCampaignEvent.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await db.adCampaignEvent.findUnique({ where: { id: billing.id } })).toBeNull();
    const aggregate = await db.adCampaignBillingAggregate.findFirstOrThrow({ where: { campaignId: campaign.id } });
    expect(aggregate.eventCount.toString()).toBe("1"); expect(aggregate.costKobo.toString()).toBe("5");
    expect((await service.sponsoredEventRetention(now, true)).unlink).toBe(0);
  });
  it("continues by immutable time/id after the previous page was disposed", async () => {
    const first = await db.accountSecurityEvent.create({ data: { userId: actorId, action: "fixture", createdAt: new Date("1800-01-01Z") } });
    const second = await db.accountSecurityEvent.create({ data: { userId: actorId, action: "fixture", createdAt: new Date("1801-01-01Z") } });
    const page = await service.run(now, true, 1);
    expect(page.decisions).toContainEqual({ model: "AccountSecurityEvent", id: first.id, outcome: "DISPOSED" });
    expect(page.nextCursors["AccountSecurityEvent:SECURITY"]).toBeDefined();
    const next = await service.run(now, true, 1, page.nextCursors);
    expect(next.decisions).toContainEqual({ model: "AccountSecurityEvent", id: second.id, outcome: "DISPOSED" });
  });

  it("does not purge a Lagos New Year financial record one year early", async () => {
    const row = await utility(new Date("2019-12-31T23:30:00Z")); // 1 January 2020 WAT
    await service.run(new Date("2027-01-01T00:00:00Z"), true);
    expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).not.toBeNull();
    const due = await service.run(new Date("2027-12-31T23:00:00Z"), true);
    expect(due.decisions).toContainEqual({ model: "UtilityTransaction", id: row.id, outcome: "DISPOSED" });
    expect(await db.utilityTransaction.findUnique({ where: { id: row.id } })).toBeNull();
  });

});
