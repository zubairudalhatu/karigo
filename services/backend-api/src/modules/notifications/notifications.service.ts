import { PartnerPushService } from "./partner-push.service";
import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { NotificationChannel, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { activeUserOperation } from "../../common/services/active-customer-operation";
import { ListAdminNotificationsQueryDto } from "./dto/list-admin-notifications-query.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { SmsNotificationProvider } from "./providers/external-placeholder.providers";
import { PushNotificationProvider } from "./providers/push-notification.provider";
import { EmailNotificationProvider } from "./providers/email-notification.provider";
import { WhatsAppNotificationProvider } from "./providers/whatsapp-notification.provider";
import { MockNotificationProvider } from "./providers/mock-notification.provider";
import { NotificationProvider } from "./providers/notification-provider.interface";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel?: NotificationChannel;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly providers: Map<NotificationChannel, NotificationProvider>;

  constructor(
    private readonly prisma: PrismaService,
    mock: MockNotificationProvider,
    sms: SmsNotificationProvider,
    email: EmailNotificationProvider,
    whatsapp: WhatsAppNotificationProvider,
    push: PushNotificationProvider,
    @Optional() private readonly partnerPush?: PartnerPushService
  ) {
    this.providers = new Map<NotificationChannel, NotificationProvider>([
      [NotificationChannel.IN_APP, mock],
      [NotificationChannel.SMS, sms],
      [NotificationChannel.EMAIL, email],
      [NotificationChannel.WHATSAPP, whatsapp],
      [NotificationChannel.PUSH, push]
    ]);
  }

  async createNotification(input: CreateNotificationInput) {
    const result = await activeUserOperation(this.prisma, input.userId, async tx => {
      const channel = input.channel ?? NotificationChannel.IN_APP;
      if (channel === NotificationChannel.IN_APP) {
        return tx.notification.create({
          data: {
            userId: input.userId,
            title: input.title,
            message: input.message,
            type: input.type,
            channel,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata as Prisma.InputJsonValue | undefined
          }
        });
      }
      try {
        return await this.providers.get(channel)!.send({ ...input, channel });
      } catch (error) {
        this.logger.warn(`External mock notification failed: ${error instanceof Error ? error.message : String(error)}`);
        return { accepted: false, provider: "mock" };
      }
    });
    if (input.entityType === "Order" && input.entityId) await this.notifyPartnerOrder(input.entityId);
    if (input.entityType === "VendorSettlement" && input.entityId) await this.notifyPartnerSettlement(input.entityId);
    return result;
  }

  async notifyPartnerSettlement(id: string) {
    try { await this.partnerPush?.settlementChanged(id); } catch { this.logger.warn("Partner settlement notification deferred."); }
  }

  async notifyPartnerOrder(orderId: string) {
    try { await this.partnerPush?.orderChanged(orderId); } catch { this.logger.warn("Partner order notification deferred"); }
  }

  listMine(userId: string, query: ListNotificationsQueryDto) {
    return this.prisma.notification.findMany({
      where: { userId, ...(query.isRead !== undefined ? { isRead: query.isRead } : {}) },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    });
  }
  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } }).then((count) => ({ count }));
  }
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.isRead) return notification;
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return { updatedCount: result.count };
  }
  adminList(query: ListAdminNotificationsQueryDto) {
    return this.prisma.notification.findMany({
      where: {
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...((query.dateFrom || query.dateTo) ? { createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
        } } : {})
      },
      select: {
        id: true, userId: true, title: true, message: true, channel: true, type: true,
        entityType: true, entityId: true, isRead: true, readAt: true, createdAt: true,
        user: { select: { fullName: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }
}
