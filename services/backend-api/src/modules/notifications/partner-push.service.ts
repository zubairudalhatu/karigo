import { createHash } from "crypto";
import { ConflictException, ForbiddenException, Inject, Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ExpoPushProvider } from "./push/providers/expo-push.provider";

@Injectable()
export class PartnerPushService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  onModuleInit() { this.timer = setInterval(() => { void this.retryPending().catch(() => undefined); }, 30_000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async retryPending() {
    if (this.running) return; this.running = true;
    try {
      await this.prisma.partnerPushDelivery.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 86400_000) } } });
      const jobs = await this.prisma.partnerPushDelivery.findMany({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) }, attempts: { lt: 5 },
        OR: [{ state: "PENDING" }, { state: "SENDING", claimedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] }, orderBy: { createdAt: "asc" }, take: 25 });
      for (const job of jobs) await this.deliver(job.userId, job.entityId, job.kind, job.eventKey);
    } finally { this.running = false; }
  }
  constructor(private readonly prisma: PrismaService, @Inject(ExpoPushProvider) private readonly push: Pick<ExpoPushProvider, "sendBulkPushNotifications">) {}

  async requireApproved(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { userId, deletedAt: null, status: "ACTIVE", user: { deletedAt: null, accountStatus: "ACTIVE" } } });
    if (!vendor) throw new ForbiddenException("Approved Partner access required.");
    return vendor;
  }
  async preferences(userId: string) {
    await this.requireApproved(userId);
    return this.prisma.partnerPushPreference.upsert({ where: { userId }, create: { userId }, update: {}, select: { enabled: true, orders: true, settlements: true } });
  }
  async setPreferences(userId: string, enabled: boolean, orders: boolean, settlements: boolean) {
    await this.requireApproved(userId);
    const result = await this.prisma.partnerPushPreference.upsert({ where: { userId },
      create: { userId, enabled, orders, settlements }, update: { enabled, orders, settlements }, select: { enabled: true, orders: true, settlements: true } });
    if (!enabled) await this.prisma.deviceToken.deleteMany({ where: { userId, appSurface: "PARTNER_APP" } });
    return result;
  }
  async register(userId: string, token: string, platform: "IOS" | "ANDROID") {
    await this.requireApproved(userId);
    if (!/^(ExpoPushToken|ExponentPushToken)\[[^\]\s]{8,}\]$/.test(token)) throw new ConflictException("Invalid Partner push registration.");
    const preference = await this.preferences(userId);
    if (!preference.enabled) throw new ForbiddenException("Enable Partner notifications first.");
    const found = await this.prisma.deviceToken.findUnique({ where: { token } });
    if (found && (found.userId !== userId || found.appSurface !== "PARTNER_APP")) throw new ConflictException("Device belongs to another application or account.");
    let result;
    try {
      result = found ? await this.prisma.deviceToken.update({ where: { token, userId, appSurface: "PARTNER_APP" },
        data: { isActive: true, lastSeenAt: new Date(), platform } })
        : await this.prisma.deviceToken.create({ data: { userId, token, platform, provider: "EXPO", appSurface: "PARTNER_APP" } });
    } catch { throw new ConflictException("Partner device registration changed; try again from notification settings."); }
    return { id: result.id };
  }
  async unregister(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token, appSurface: "PARTNER_APP" } });
    return { removed: true };
  }

  async orderChanged(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { vendor: { include: { user: true } } } });
    if (!order?.vendor) return;
    const kind = ["PAID", "VENDOR_CONFIRMING"].includes(order.orderStatus) ? "NEW_ORDER" : order.orderStatus === "CANCELLED" ? "CANCELLED" : "ORDER_STATUS";
    const eventKey=`order:${order.id}:${order.orderStatus}:${order.updatedAt.toISOString()}`;
    await this.recordInbox(order.vendor.userId,order.id,"Order",kind,eventKey);
    return this.deliver(order.vendor.userId, order.id, kind, eventKey);
  }
  async settlementChanged(id: string) {
    const settlement = await this.prisma.vendorSettlement.findUnique({ where: { id }, include: { vendor: true } });
    if (!settlement || settlement.settlementStatus !== "PAID") return;
    const eventKey=`settlement:${id}:PAID`;
    await this.recordInbox(settlement.vendor.userId,id,"VendorSettlement","SETTLEMENT",eventKey);
    return this.deliver(settlement.vendor.userId, id, "SETTLEMENT", eventKey);
  }

  private async recordInbox(userId:string,entityId:string,entityType:string,kind:string,eventKey:string) {
    try {await this.requireApproved(userId);} catch {return;}
    const hex=createHash("sha256").update("partner-inbox:"+userId+":"+eventKey).digest("hex");
    const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    await this.prisma.notification.upsert({where:{id},create:{id,userId,entityId,entityType,type:"SYSTEM_ALERT",title:kind==="SETTLEMENT"?"Settlement update":"Order update",message:"Open KariGO Partner to view this update."},update:{}});
  }

  private async deliver(userId: string, entityId: string, kind: string, eventKey: string) {
    // Recheck current ownership/approval/preference, including on an outbox retry.
    try { await this.requireApproved(userId); } catch { return; }
    const preference = await this.prisma.partnerPushPreference.findUnique({ where: { userId } });
    if (!preference?.enabled || (kind === "SETTLEMENT" ? !preference.settlements : !preference.orders)) return;
    const devices = await this.prisma.deviceToken.findMany({ where: { userId, appSurface: "PARTNER_APP", provider: "EXPO", isActive: true }, select: { token: true } });
    if (!devices.length) return;
    let job;
    try { job = await this.prisma.partnerPushDelivery.create({ data: { userId, entityId, kind, eventKey } }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      job = await this.prisma.partnerPushDelivery.findUniqueOrThrow({ where: { eventKey } });
    }
    // Never deliver an old owner's work after reassignment.
    const owner = kind === "SETTLEMENT"
      ? await this.prisma.vendorSettlement.findFirst({ where: { id: entityId, vendor: { userId }, settlementStatus: "PAID" } })
      : await this.prisma.order.findFirst({ where: { id: entityId, vendor: { userId } } });
    if (!owner) return;
    const claimed = await this.prisma.partnerPushDelivery.updateMany({ where: { id: job.id, attempts: { lt: 5 },
      OR: [{ state: "PENDING" }, { state: "SENDING", claimedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] },
      data: { state: "SENDING", claimedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) return;
    try {
      const result = await this.push.sendBulkPushNotifications(devices.map(device => ({ toDeviceToken: device.token,
        title: kind === "NEW_ORDER" ? "New KariGO order" : kind === "CANCELLED" ? "KariGO order cancelled" : kind === "SETTLEMENT" ? "KariGO settlement update" : "KariGO order update",
        body: "Open KariGO Partner to view this update.",
        data: { appSurface: "PARTNER_APP", route: kind === "SETTLEMENT" ? "earnings" : "order", entityId }
      })));
      await this.prisma.partnerPushDelivery.update({ where: { id: job.id }, data: { state: result.accepted ? "SENT" : "PENDING", sentAt: result.accepted ? new Date() : null } });
    } catch {
      await this.prisma.partnerPushDelivery.update({ where: { id: job.id }, data: { state: "PENDING" } });
    }
  }
}
