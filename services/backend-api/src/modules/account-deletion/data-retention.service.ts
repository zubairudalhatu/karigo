import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { accountingDayStart, accountingMonthStart, addMonths, DAY_MS, holdActive, isHeld, RetentionCategory, retentionExpiry, RETENTION_POLICY_VERSION } from "./retention-policy";

export const FINANCIAL_YEAR_END = { month: 12, day: 31 }; // owner confirmed 15 October 2026
const holdKinds = new Set(["INTERNAL", "LEGAL", "COURT", "REGULATORY"]);
const holdResources = new Set(["UtilityTransaction", "Payment", "PaymentWebhookLog", "CustomerWalletLedgerEntry", "Order", "TaxiTrip",
  "TaxiRideSettlement", "TaxiRideRefund", "SupportTicket", "AccountSecurityEvent", "UserLoginActivity", "AdminAuditLog", "VendorAuditLog", "DataRetentionResource", "AdCampaignEvent", "AdCampaignBillingAggregate"]);
const reference = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,119}$/;
type Delegate = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  count(args: unknown): Promise<number>;
  deleteMany(args: unknown): Promise<{ count: number }>;
};
function delegate(tx: Prisma.TransactionClient, model: string): Delegate {
  if (!Prisma.dmmf.datamodel.models.some(m => m.name === model)) throw new Error("Unknown retention model.");
  return (tx as unknown as Record<string, Delegate>)[model[0].toLowerCase() + model.slice(1)];
}
interface Source { model: string; category: RetentionCategory; trigger: string; where?: Record<string, unknown>; caseResolved?: string }
// Every source has a verified trigger. Unknown sources/unfinished cases never get a guessed date.
export const RETENTION_SOURCES: Source[] = [
  { model: "UserLoginActivity", category: "SECURITY", trigger: "createdAt" },
  { model: "AccountSecurityEvent", category: "SECURITY", trigger: "createdAt" },
  { model: "AdminAuditLog", category: "SECURITY", trigger: "createdAt", where: { action: { not: "CUSTOMER_ERASURE_COMPLETED" } } },
  { model: "VendorAuditLog", category: "SECURITY", trigger: "createdAt" },
  { model: "SupportTicket", category: "SUPPORT", trigger: "closedAt", where: { status: { in: ["RESOLVED", "CLOSED"] }, closedAt: { not: null } } },
  { model: "AccountDeletionRequest", category: "DELETION_AUDIT", trigger: "completedAt", where: { status: "COMPLETED", completedAt: { not: null } } },
  { model: "AdminAuditLog", category: "DELETION_AUDIT", trigger: "createdAt", where: { action: "CUSTOMER_ERASURE_COMPLETED" } },
  { model: "CustomerWalletLedgerEntry", category: "FINANCIAL", trigger: "createdAt", where: { status: { in: ["POSTED", "REVERSED"] } } },
  { model: "Payment", category: "FINANCIAL", trigger: "createdAt", where: { paymentStatus: { in: ["SUCCESSFUL", "FAILED", "REFUNDED"] } } },
  { model: "UtilityTransaction", category: "FINANCIAL", trigger: "createdAt", where: { status: { in: ["SUCCESSFUL", "FAILED", "CANCELLED"] } } },
  { model: "Order", category: "FINANCIAL", trigger: "createdAt", where: { orderStatus: { in: ["COMPLETED", "CANCELLED", "FAILED", "REFUNDED", "VENDOR_REJECTED"] } } },
  { model: "TaxiTrip", category: "FINANCIAL", trigger: "createdAt", where: { status: { in: ["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"] } } },
  { model: "TaxiRideReceipt", category: "FINANCIAL", trigger: "completedAt" },
  { model: "TaxiRideSettlement", category: "FINANCIAL", trigger: "createdAt", caseResolved: "disputeResolvedAt" },
  { model: "TaxiRideFinancialLedgerEntry", category: "FINANCIAL", trigger: "createdAt" },
  { model: "TaxiRideRefund", category: "FINANCIAL", trigger: "createdAt", where: { status: "CASH_REFUND_SETTLED" } },
  { model: "VendorSettlement", category: "FINANCIAL", trigger: "createdAt", where: { settlementStatus: "PAID" } },
  { model: "RiderEarning", category: "FINANCIAL", trigger: "createdAt" },
  { model: "VendorAdCreditLedgerEntry", category: "FINANCIAL", trigger: "createdAt" },
  { model: "AdCampaignBillingAggregate", category: "FINANCIAL", trigger: "eventMonth" }
];

@Injectable()
export class DataRetentionService {
  constructor(private readonly prisma: PrismaService) {}

  private async governed<T>(action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async tx => {
      // Hold lifecycle and cleanup share this lock, preventing a new hold racing a purge.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('karigo-retention-governance'))::text AS lock`;
      return action(tx);
    }, { timeout: 60_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async authorize(tx: Prisma.TransactionClient, actorId: string, authorityReference: string) {
    const approved = (process.env.RETENTION_LEGAL_AUTHORIZER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, accountStatus: true, deletedAt: true } });
    if (!approved.includes(actorId) || actor?.role !== "ADMIN" || actor.accountStatus !== "ACTIVE" || actor.deletedAt) {
      throw new ForbiddenException("An explicitly designated Legal/Compliance authorizer is required.");
    }
    if (!reference.test(authorityReference)) throw new BadRequestException("A non-personal Legal/Compliance authority reference is required.");
  }

  async createHold(input: { actorId: string; authorityReference: string; resourceType: string; resourceId: string; kind: string; reasonCode: string }, now = new Date()) {
    if (!holdResources.has(input.resourceType)
      || !holdKinds.has(input.kind) || !reference.test(input.reasonCode) || !reference.test(input.resourceId)
      || !Prisma.dmmf.datamodel.models.some(m => m.name === input.resourceType)) throw new BadRequestException("A supported record-scoped hold is required.");
    return this.governed(async tx => {
      await this.authorize(tx, input.actorId, input.authorityReference);
      if (!await delegate(tx, input.resourceType).findUnique({ where: { id: input.resourceId }, select: { id: true } })) throw new BadRequestException("Hold target not found.");
      const hold = await tx.dataRetentionHold.create({ data: { resourceType: input.resourceType, resourceId: input.resourceId, kind: input.kind,
        reasonCode: input.reasonCode, authorityReference: input.authorityReference, authorizedById: input.actorId,
        startedAt: now, nextReviewAt: new Date(now.getTime() + 90 * DAY_MS), expiresAt: input.kind === "INTERNAL" ? addMonths(now, 12) : null } });
      await tx.dataRetentionHoldEvent.create({ data: { holdId: hold.id, actorId: input.actorId, authorityReference: input.authorityReference, action: "AUTHORIZED" } });
      return hold;
    });
  }

  async reviewHold(id: string, actorId: string, authorityReference: string, action: "REVIEW" | "RENEW" | "RELEASE", now = new Date()) {
    return this.governed(async tx => {
      await this.authorize(tx, actorId, authorityReference);
      const hold = await tx.dataRetentionHold.findUniqueOrThrow({ where: { id } });
      if (hold.releasedAt) return hold;
      if (action === "RENEW" && hold.kind !== "INTERNAL") throw new BadRequestException("Only internal holds have a renewable expiry.");
      const updated = await tx.dataRetentionHold.update({ where: { id }, data: action === "RELEASE" ? { releasedAt: now }
        : { nextReviewAt: new Date(now.getTime() + 90 * DAY_MS), ...(action === "RENEW" ? { expiresAt: addMonths(now, 12) } : {}) } });
      await tx.dataRetentionHoldEvent.create({ data: { holdId: id, actorId, authorityReference, action } });
      return updated;
    });
  }

  // Explicit registration for a resolved fraud/dispute case; resolution date is required,
  // not inferred from updatedAt. Existing financial/support records then honor the later case deadline.
  async registerCase(resourceType: string, resourceId: string, resolvedAt: Date, actorId: string, authorityReference: string) {
    return this.governed(async tx => {
      await this.authorize(tx, actorId, authorityReference);
      if (!await delegate(tx, resourceType).findUnique({ where: { id: resourceId }, select: { id: true } })) throw new BadRequestException("Case record not found.");
      return tx.dataRetentionResource.upsert({ where: { resourceType_resourceId: { resourceType, resourceId } },
        create: { resourceType, resourceId, category: "CASE", triggerAt: resolvedAt, retainUntil: retentionExpiry("CASE", resolvedAt), policyVersion: RETENTION_POLICY_VERSION, evidenceReference: authorityReference },
        update: { category: "CASE", triggerAt: resolvedAt, retainUntil: retentionExpiry("CASE", resolvedAt), evidenceReference: authorityReference } });
    });
  }

  async expireReceiptCapabilities(now = new Date(), apply = false) {
    const where: Prisma.AccountDeletionRequestWhereInput = { status: "COMPLETED", completedAt: { lte: new Date(now.getTime() - 90 * DAY_MS) }, receiptTokenHash: { not: null } };
    if (!apply) return { eligible: await this.prisma.accountDeletionRequest.count({ where }), changed: 0 };
    // The compliance row remains intact. Clearing a capability twice is a no-op.
    return this.governed(async tx => ({ changed: (await tx.accountDeletionRequest.updateMany({ where, data: { receiptTokenHash: null } })).count }));
  }

  async sponsoredEventRetention(now = new Date(), apply = false) {
    return this.governed(async tx => {
      const holds = await tx.dataRetentionHold.findMany();
      const heldIds = holds.filter(h => h.resourceType === "AdCampaignEvent" && holdActive(h, now)).map(h => h.resourceId);
      const events = await tx.adCampaignEvent.findMany({ where: { id: { notIn: heldIds }, occurredAt: { lte: new Date(now.getTime() - 90 * DAY_MS) },
        OR: [{ dedupeKeyHash: { not: null } }, { dedupeKeyHash: null, occurredAt: { lte: addMonths(now, -24) } }] }, orderBy: { occurredAt: "asc" }, take: 500 });
      let unlink = 0, dispose = 0, billingProjectionRequired = 0, held = 0;
      for (const row of events) {
        if (isHeld(holds, "AdCampaignEvent", row.id, now)) { held++; continue; }
        if (row.dedupeKeyHash) {
          unlink++;
          // No User/Customer identifier or render token is otherwise stored on
          // this model. Remove the hash and precision useful for correlation.
          if (apply) await tx.adCampaignEvent.update({ where: { id: row.id }, data: { dedupeKeyHash: null,
            occurredAt: accountingDayStart(row.occurredAt) } });
        }
        if (addMonths(row.occurredAt, 24) <= now) {
          if (row.costKobo !== 0) {
            billingProjectionRequired++;
            if (apply) {
              const campaign = await tx.adCampaign.findUniqueOrThrow({ where: { id: row.campaignId }, select: { campaignReference: true } });
              const eventMonth = accountingMonthStart(row.occurredAt);
              await tx.adCampaignBillingAggregate.upsert({ where: { campaignId_eventMonth_eventType: { campaignId: row.campaignId, eventMonth, eventType: row.eventType } },
                create: { campaignId: row.campaignId, campaignReference: campaign.campaignReference, eventMonth, eventType: row.eventType, eventCount: 1, costKobo: row.costKobo },
                update: { eventCount: { increment: 1 }, costKobo: { increment: row.costKobo } } });
            }
          }
          dispose++;
          if (apply) await tx.adCampaignEvent.delete({ where: { id: row.id } });
        }
      }
      held = heldIds.length;
      return { dryRun: !apply, unlink, dispose, billingProjectionRequired, held };
    });
  }

  async run(now = new Date(), apply = false, limit = 100, cursors: Record<string, string> = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new BadRequestException("Retention batch must be 1–500.");
    return this.governed(async tx => {
      const holds = await tx.dataRetentionHold.findMany();
      const decisions: { model: string; id: string; outcome: string }[] = [];
      const nextCursors: Record<string, string> = {};
      for (const source of RETENTION_SOURCES) {
        // Fetch oldest first with bounded batches; an unfinished record never obtains a deadline.
        const cursorKey = `${source.model}:${source.category}`;
        let after: { at: string; id: string } | undefined;
        if (cursors[cursorKey]) {
          try { after = JSON.parse(Buffer.from(cursors[cursorKey], "base64url").toString("utf8")); } catch { throw new BadRequestException("Invalid retention continuation."); }
          if (!after || !Number.isFinite(Date.parse(after.at)) || !/^[a-f0-9-]{36}$/i.test(after.id)) throw new BadRequestException("Invalid retention continuation.");
        }
        const records = await delegate(tx, source.model).findMany({ where: { AND: [source.where ?? {}, ...(after ? [{ OR: [
          { [source.trigger]: { gt: new Date(after.at) } }, { [source.trigger]: new Date(after.at), id: { gt: after.id } }
        ] }] : [])] }, orderBy: [{ [source.trigger]: "asc" }, { id: "asc" }],
          take: limit });
        if (records.length === limit) nextCursors[cursorKey] = Buffer.from(JSON.stringify({ at: (records[records.length - 1][source.trigger] as Date).toISOString(), id: records[records.length - 1].id })).toString("base64url");
        for (const row of records) {
          const id = String(row.id), trigger = row[source.trigger];
          if (!(trigger instanceof Date)) continue;
          let expires = retentionExpiry(source.category, trigger, FINANCIAL_YEAR_END);
          if (source.caseResolved && row.disputeOpenedAt && !row[source.caseResolved]) continue;
          if (source.caseResolved && row[source.caseResolved] instanceof Date) expires = new Date(Math.max(expires.getTime(), retentionExpiry("CASE", row[source.caseResolved] as Date).getTime()));
          const caseRule = await tx.dataRetentionResource.findUnique({ where: { resourceType_resourceId: { resourceType: source.model, resourceId: id } } });
          if (caseRule && !caseRule.disposedAt) expires = new Date(Math.max(expires.getTime(), caseRule.retainUntil.getTime()));
          if (expires > now) continue;
          if (isHeld(holds, source.model, id, now) || (caseRule && isHeld(holds, "DataRetentionResource", caseRule.id, now))) { decisions.push({ model: source.model, id, outcome: "HELD" }); continue; }
          // Never cascade away an unknown, younger or held dependency. An operator
          // resolves blocked aggregates explicitly; no force/cascade fallback exists.
          let blocked = false;
          const ownedChildren: { model: string; ids: string[] }[] = [];
          for (const child of Prisma.dmmf.datamodel.models) {
            for (const relation of child.fields.filter(f => f.kind === "object" && f.type === source.model && f.relationFromFields?.length === 1)) {
              const childWhere = { [relation.relationFromFields![0]]: id };
              const safeOwned = (source.model === "SupportTicket" && child.name === "SupportTicketMessage")
                || (source.model === "Order" && ["OrderItem", "OrderStatusHistory"].includes(child.name));
              if (safeOwned) {
                const children = await delegate(tx, child.name).findMany({ where: childWhere, select: { id: true }, take: 5001 });
                if (children.length > 5000 || children.some(r => isHeld(holds, child.name, String(r.id), now))) blocked = true;
                for (const r of children) {
                  const childCase = await tx.dataRetentionResource.findUnique({ where: { resourceType_resourceId: { resourceType: child.name, resourceId: String(r.id) } } });
                  if (childCase && childCase.retainUntil > now) blocked = true;
                }
                ownedChildren.push({ model: child.name, ids: children.map(r => String(r.id)) });
              } else if (await delegate(tx, child.name).count({ where: childWhere })) blocked = true;
            }
          }
          if (blocked) { decisions.push({ model: source.model, id, outcome: "DEPENDENCY_REVIEW_REQUIRED" }); continue; }
          if (apply) {
            for (const children of ownedChildren) await delegate(tx, children.model).deleteMany({ where: { id: { in: children.ids } } });
            await delegate(tx, source.model).deleteMany({ where: { id } });
            if (caseRule && caseRule.retainUntil <= now) await tx.dataRetentionResource.deleteMany({ where: { id: caseRule.id } });
          }
          decisions.push({ model: source.model, id, outcome: apply ? "DISPOSED" : "ELIGIBLE" });
        }
      }
      return { policyVersion: RETENTION_POLICY_VERSION, dryRun: !apply, decisions, nextCursors,
        overdueHoldReviews: holds.filter(h => holdActive(h, now) && h.nextReviewAt <= now).map(h => h.id) };
    });
  }
}

// Apply record-scoped holds to erasure writes as well as timed cleanup. Parent
// holds propagate to owned child rows, while unrelated records continue cleanup.
export async function heldErasureClient(tx: Prisma.TransactionClient, now = new Date()): Promise<Prisma.TransactionClient> {
  const holds = (await tx.dataRetentionHold.findMany()).filter(h => holdActive(h, now));
  const excluded = new Map<string, Set<string>>();
  const queue = holds.map(h => ({ model: h.resourceType, id: h.resourceId }));
  let processed = 0;
  while (queue.length) {
    if (++processed > 5000) throw new Error("Hold graph requires bounded manual review.");
    const { model, id } = queue.shift()!;
    const ids = excluded.get(model) ?? new Set<string>();
    if (ids.has(id)) continue;
    ids.add(id); excluded.set(model, ids);
    if (!["AdminAuditLog", "DataRetentionHold", "DataRetentionHoldEvent"].includes(model)) {
      const auditRows = await tx.adminAuditLog.findMany({ where: { entityId: id }, select: { id: true }, take: 5001 });
      if (auditRows.length > 5000) throw new Error("Hold audit graph requires review.");
      queue.push(...auditRows.map(r => ({ model: "AdminAuditLog", id: r.id })));
    }
    if (model === "Payment") {
      const payment = await tx.payment.findUnique({ where: { id }, select: { transactionReference: true, walletLedgerEntryId: true } });
      if (payment) {
        const webhooks = await tx.paymentWebhookLog.findMany({ where: { transactionReference: payment.transactionReference }, select: { id: true }, take: 5001 });
        if (webhooks.length > 5000) throw new Error("Hold callback graph requires review.");
        queue.push(...webhooks.map(r => ({ model: "PaymentWebhookLog", id: r.id })));
        if (payment.walletLedgerEntryId) queue.push({ model: "CustomerWalletLedgerEntry", id: payment.walletLedgerEntryId });
      }
    }
    if (["Order", "ServiceProviderRequest"].includes(model)) {
      const record = await delegate(tx, model).findUnique({ where: { id } });
      for (const field of ["pickupAddressId", "deliveryAddressId", "serviceAddressId"]) if (typeof record?.[field] === "string") queue.push({ model: "Address", id: String(record[field]) });
    }
    for (const child of Prisma.dmmf.datamodel.models) for (const relation of child.fields.filter(f => f.kind === "object" && f.type === model && f.relationFromFields?.length === 1)) {
      // Holding a User cannot silently hold every business record: only explicit
      // record scopes are allowed for connected identities. See createHold guard.
      if (model === "User" || model === "CustomerProfile") continue;
      const children = await delegate(tx, child.name).findMany({ where: { [relation.relationFromFields![0]]: id }, select: { id: true }, take: 5001 });
      if (children.length > 5000) throw new Error("Hold dependency graph requires review.");
      queue.push(...children.map(r => ({ model: child.name, id: String(r.id) })));
    }
  }
  return new Proxy(tx, { get(target, property) {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name[0].toLowerCase() + m.name.slice(1) === property);
    const value = Reflect.get(target, property);
    const ids = model && excluded.get(model.name);
    if (!ids?.size) return typeof value === "function" ? value.bind(target) : value;
    return new Proxy(value, { get(d, method) {
      if (["deleteMany", "updateMany"].includes(String(method))) return (args: { where?: unknown }) => d[method]({ ...args, where: { AND: [args.where ?? {}, { id: { notIn: [...ids] } }] } });
      if (["delete", "update"].includes(String(method))) return async (args: { where: { id?: string } }) => {
        if (!args.where.id) throw new Error("Held erasure write requires an explicit record ID.");
        return ids.has(args.where.id) ? d.findUniqueOrThrow({ where: args.where }) : d[method](args);
      };
      return typeof d[method] === "function" ? d[method].bind(d) : d[method];
    } });
  } });
}
